import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { AGENT_PROVIDER, IAgentProvider, AgentSessionEvent, AgentSessionEventType } from '@ai-orchestrator/core-interfaces';
import { TASK_STORAGE, ITaskStorage } from '@ai-orchestrator/core-interfaces';
import { CONTEXT_DB, IContextDB } from '@ai-orchestrator/core-interfaces';
import { EVENT_BUS, IEventBus } from '@ai-orchestrator/core-interfaces';
import { TEST_RUNNER, ITestRunner } from '@ai-orchestrator/core-interfaces';
import { PR_PROVIDER, IPRProvider } from '@ai-orchestrator/core-interfaces';
import { TaskStatus, AgentStatus } from '@ai-orchestrator/shared';
import { transitionTask, InvalidTransitionError, canTransition } from './state-machine';

@Injectable()
export class TaskLifecycleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TaskLifecycleService.name);
  private unsubscribeFromEvents: (() => void) | null = null;
  private activeTaskId: string | null = null;
  private processing = false;

  constructor(
    @Inject(TASK_STORAGE) private readonly taskStorage: ITaskStorage,
    @Inject(AGENT_PROVIDER) private readonly agentProvider: IAgentProvider,
    @Inject(CONTEXT_DB) private readonly contextDb: IContextDB,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(TEST_RUNNER) private readonly testRunner: ITestRunner,
    @Inject(PR_PROVIDER) private readonly prProvider: IPRProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing TaskLifecycleService — subscribing to agent events');
    try {
      this.unsubscribeFromEvents = await this.agentProvider.onSessionEvent(
        this.handleAgentEvent.bind(this),
      );
      this.logger.log('Subscribed to agent session events');
    } catch (error) {
      this.logger.error(`Failed to subscribe to agent events: ${error instanceof Error ? error.message : String(error)}`);
    }

    this.eventBus.on('orchestration.run', this.handleRunCommand.bind(this));
  }

  onModuleDestroy(): void {
    if (this.unsubscribeFromEvents) {
      this.unsubscribeFromEvents();
      this.unsubscribeFromEvents = null;
    }
  }

  getActiveTaskId(): string | null {
    return this.activeTaskId;
  }

  isProcessing(): boolean {
    return this.processing;
  }

  async startTask(taskId: string): Promise<void> {
    this.logger.log(`Starting task: ${taskId}`);

    if (this.processing && this.activeTaskId) {
      this.logger.warn(`Cannot start task ${taskId} — task ${this.activeTaskId} is already being processed`);
      return;
    }

    const task = await this.taskStorage.getTask(taskId);
    const currentStatus = task.status as TaskStatus;

    if (!canTransition(currentStatus, TaskStatus.InProgress)) {
      this.logger.warn(`Cannot transition task ${taskId} from ${currentStatus} to in_progress`);
      return;
    }

    const sessions = await this.contextDb.getTaskSessions();
    const existing = sessions.find(
      (s) => s.taskId === taskId && s.status === TaskStatus.InProgress,
    );
    if (existing) {
      this.logger.warn(`Task ${taskId} already has an active session`);
      return;
    }

    const session = await this.agentProvider.createSession({
      taskId,
      prompt: `Implement task: ${task.name}\n\n${task.description}`,
      workingDirectory: process.cwd(),
    });

    const transition = transitionTask(taskId, currentStatus, TaskStatus.InProgress);

    await this.taskStorage.updateTask(taskId, { status: TaskStatus.InProgress });

    await this.contextDb.addTaskSession({
      taskId,
      agentSessionId: session.id,
      status: TaskStatus.InProgress,
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await this.contextDb.updateScheduleEntry(taskId, { agentSessionId: session.id });

    this.activeTaskId = taskId;
    this.processing = true;

    this.eventBus.emit(transition.event, {
      taskId,
      agentSessionId: session.id,
      previousStatus: currentStatus,
      newStatus: TaskStatus.InProgress,
      timestamp: transition.timestamp,
    });

    this.logger.log(`Task ${taskId} started with agent session ${session.id}`);
  }

  async reviewTask(taskId: string): Promise<void> {
    this.logger.log(`Reviewing task: ${taskId}`);

    const task = await this.taskStorage.getTask(taskId);
    const currentStatus = task.status as TaskStatus;

    if (currentStatus !== TaskStatus.InProgress) {
      this.logger.warn(`Cannot review task ${taskId} in status ${currentStatus} — must be in_progress`);
      return;
    }

    const sessions = await this.contextDb.getTaskSessions();
    const taskSession = sessions.find((s) => s.taskId === taskId);
    if (!taskSession) {
      this.logger.error(`No session found for task ${taskId}`);
      return;
    }

    const testResult = await this.testRunner.run({
      command: 'make test',
      workingDirectory: process.cwd(),
      timeout: 300000,
    });

    this.eventBus.emit('task.review_completed', {
      taskId,
      agentSessionId: taskSession.agentSessionId,
      passed: testResult.passed,
      exitCode: testResult.exitCode,
      output: testResult.stdout,
      timestamp: new Date().toISOString(),
    });

    if (testResult.passed) {
      await this.advanceTask(taskId, TaskStatus.Completed);
      await this.approveTask(taskId);
    } else {
      this.logger.warn(`Tests failed for task ${taskId} (exit code ${testResult.exitCode})`);
      await this.advanceTask(taskId, TaskStatus.Completed);
      await this.advanceTask(taskId, TaskStatus.NeedsRevision);
    }
  }

  async approveTask(taskId: string): Promise<void> {
    this.logger.log(`Approving task: ${taskId}`);

    const task = await this.taskStorage.getTask(taskId);
    const currentStatus = task.status as TaskStatus;

    if (!canTransition(currentStatus, TaskStatus.Approved)) {
      this.logger.warn(`Cannot approve task ${taskId} from status ${currentStatus}`);
      return;
    }

    await this.advanceTask(taskId, TaskStatus.Approved);
  }

  async createPRForTask(taskId: string): Promise<void> {
    this.logger.log(`Creating PR for task: ${taskId}`);

    const task = await this.taskStorage.getTask(taskId);
    const currentStatus = task.status as TaskStatus;

    if (!canTransition(currentStatus, TaskStatus.PrCreated)) {
      this.logger.warn(`Cannot create PR for task ${taskId} from status ${currentStatus}`);
      return;
    }

    const sessions = await this.contextDb.getTaskSessions();
    const taskSession = sessions.find((s) => s.taskId === taskId);
    if (!taskSession) {
      this.logger.error(`No session found for task ${taskId}`);
      return;
    }

    const diff = await this.agentProvider.getDiff(taskSession.agentSessionId);
    const branchName = `task/${taskId}`;

    const pr = await this.prProvider.createPullRequest({
      title: `[Task ${taskId}] ${task.name}`,
      body: `${task.description}\n\n## Changes\n\`\`\`diff\n${diff}\n\`\`\``,
      head: branchName,
      base: 'main',
    });

    await this.advanceTask(taskId, TaskStatus.PrCreated);

    this.eventBus.emit('task.pr_created', {
      taskId,
      prNumber: pr.number,
      prUrl: pr.url,
      timestamp: new Date().toISOString(),
    });
  }

  async enqueueTasks(listId: string): Promise<number> {
    this.logger.log(`Enqueuing tasks from list: ${listId}`);

    const tasks = await this.taskStorage.listTasks(listId);
    const schedule = await this.contextDb.getSchedule();
    const existingTaskIds = new Set(schedule.map((e) => e.taskId));

    let added = 0;
    for (const task of tasks) {
      if (existingTaskIds.has(task.id)) continue;

      await this.contextDb.addScheduleEntry({
        taskId: task.id,
        scheduledAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
      });
      added++;
    }

    this.logger.log(`Enqueued ${added} new tasks from list ${listId}`);
    return added;
  }

  async dequeueNextTask(): Promise<string | null> {
    const schedule = await this.contextDb.getSchedule();

    const next = schedule.find(
      (entry) => entry.retryCount < entry.maxRetries && !entry.agentSessionId,
    );

    if (!next) {
      this.logger.log('No pending tasks in queue');
      return null;
    }

    await this.startTask(next.taskId);
    return next.taskId;
  }

  async runSerialPipeline(): Promise<string | null> {
    this.logger.log('Starting serial pipeline');

    if (this.processing && this.activeTaskId) {
      this.logger.warn(`Pipeline already running for task ${this.activeTaskId}`);
      return this.activeTaskId;
    }

    return this.dequeueNextTask();
  }

  async getOrchestrationStatus(): Promise<{
    processing: boolean;
    activeTaskId: string | null;
    pendingTasks: number;
    activeTasks: number;
    completedTasks: number;
  }> {
    const sessions = await this.contextDb.getTaskSessions();
    const schedule = await this.contextDb.getSchedule();

    return {
      processing: this.processing,
      activeTaskId: this.activeTaskId,
      pendingTasks: schedule.filter((e) => !e.agentSessionId).length,
      activeTasks: sessions.filter((s) => s.status === TaskStatus.InProgress).length,
      completedTasks: sessions.filter((s) => s.status === TaskStatus.Done).length,
    };
  }

  private async handleAgentEvent(event: AgentSessionEvent): Promise<void> {
    if (!this.activeTaskId) return;

    const sessions = await this.contextDb.getTaskSessions();
    const taskSession = sessions.find((s) => s.taskId === this.activeTaskId);
    if (!taskSession) return;

    if (event.sessionId && event.sessionId !== taskSession.agentSessionId) return;

    const data = event.data as Record<string, unknown>;
    const mappedStatus = data.mappedStatus as AgentStatus | undefined;

    switch (event.type) {
      case AgentSessionEventType.SessionDiff: {
        this.logger.log(`Agent completed for task ${this.activeTaskId}`);
        await this.handleAgentCompleted(this.activeTaskId);
        break;
      }
      case AgentSessionEventType.SessionError: {
        this.logger.error(`Agent failed for task ${this.activeTaskId}`);
        await this.handleAgentFailed(this.activeTaskId);
        break;
      }
      case AgentSessionEventType.PermissionUpdated: {
        this.logger.log(`Permission request for task ${this.activeTaskId} — auto-approving`);
        await this.handlePermissionRequest(event);
        break;
      }
      case AgentSessionEventType.SessionIdle: {
        this.logger.log(`Agent idle for task ${this.activeTaskId}`);
        break;
      }
      case AgentSessionEventType.SessionStatus: {
        if (mappedStatus === AgentStatus.Failed) {
          this.logger.error(`Agent status failed for task ${this.activeTaskId}`);
          await this.handleAgentFailed(this.activeTaskId);
        }
        break;
      }
      default:
        break;
    }
  }

  private async handleAgentCompleted(taskId: string): Promise<void> {
    await this.reviewTask(taskId);
  }

  private async handleAgentFailed(taskId: string): Promise<void> {
    const schedule = await this.contextDb.getSchedule();
    const entry = schedule.find((e) => e.taskId === taskId);

    const newRetryCount = (entry?.retryCount ?? 0) + 1;
    const maxRetries = entry?.maxRetries ?? 3;

    await this.contextDb.updateScheduleEntry(taskId, {
      retryCount: newRetryCount,
    });

    if (newRetryCount >= maxRetries) {
      this.logger.error(`Task ${taskId} failed after ${maxRetries} retries — marking as needs_intervention`);
      await this.advanceTask(taskId, TaskStatus.NeedsIntervention);
      this.processing = false;
      this.activeTaskId = null;
    } else {
      this.logger.warn(`Task ${taskId} failed (attempt ${newRetryCount}/${maxRetries}) — will retry`);
      await this.contextDb.updateScheduleEntry(taskId, { agentSessionId: undefined });
      this.processing = false;
      this.activeTaskId = null;
      await this.dequeueNextTask();
    }
  }

  private async handlePermissionRequest(event: AgentSessionEvent): Promise<void> {
    const data = event.data as Record<string, unknown>;
    const sessionId = event.sessionId;
    const permissionId = data.permissionID as string | undefined;

    if (!sessionId || !permissionId) {
      this.logger.warn('Permission event missing sessionId or permissionID — skipping auto-approve');
      return;
    }

    try {
      await this.agentProvider.grantPermission(sessionId, permissionId, 'always');
      this.logger.log(`Auto-approved permission ${permissionId} for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to auto-approve permission ${permissionId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async advanceTask(taskId: string, newStatus: TaskStatus): Promise<void> {
    const task = await this.taskStorage.getTask(taskId);
    const currentStatus = task.status as TaskStatus;

    try {
      const transition = transitionTask(taskId, currentStatus, newStatus);

      await this.taskStorage.updateTask(taskId, { status: newStatus });

      await this.contextDb.updateTaskSession(taskId, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      this.eventBus.emit(transition.event, {
        taskId,
        previousStatus: currentStatus,
        newStatus,
        timestamp: transition.timestamp,
      });

      this.logger.log(`Task ${taskId} transitioned: ${currentStatus} → ${newStatus} (${transition.event})`);

      if (newStatus === TaskStatus.Approved) {
        await this.createPRForTask(taskId);
      }

      if (newStatus === TaskStatus.PrCreated || newStatus === TaskStatus.NeedsIntervention || newStatus === TaskStatus.Blocked) {
        this.processing = false;
        this.activeTaskId = null;
      }
    } catch (error) {
      if (error instanceof InvalidTransitionError) {
        this.logger.error(`Invalid transition for task ${taskId}: ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  private async handleRunCommand(payload: unknown): Promise<void> {
    const data = payload as { listId?: string };
    if (data?.listId) {
      await this.enqueueTasks(data.listId);
    }
    await this.runSerialPipeline();
  }
}