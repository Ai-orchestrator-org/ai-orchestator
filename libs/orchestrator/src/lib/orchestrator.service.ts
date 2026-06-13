import { Injectable, Inject, Logger } from '@nestjs/common';
import { TASK_STORAGE, ITaskStorage } from '@ai-orchestrator/core-interfaces';
import { AGENT_PROVIDER, IAgentProvider } from '@ai-orchestrator/core-interfaces';
import { CONTEXT_DB, IContextDB } from '@ai-orchestrator/core-interfaces';
import { EVENT_BUS, IEventBus } from '@ai-orchestrator/core-interfaces';
import { TEST_RUNNER, ITestRunner } from '@ai-orchestrator/core-interfaces';
import { PR_PROVIDER, IPRProvider } from '@ai-orchestrator/core-interfaces';
import { TaskStatus, AgentStatus } from '@ai-orchestrator/shared';
import { canTransition } from './state-machine';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    @Inject(TASK_STORAGE) private readonly taskStorage: ITaskStorage,
    @Inject(AGENT_PROVIDER) private readonly agentProvider: IAgentProvider,
    @Inject(CONTEXT_DB) private readonly contextDb: IContextDB,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(TEST_RUNNER) private readonly testRunner: ITestRunner,
    @Inject(PR_PROVIDER) private readonly prProvider: IPRProvider,
  ) {}

  async startTask(taskId: string): Promise<void> {
    this.logger.log(`Starting task: ${taskId}`);

    const config = await this.contextDb.getConfig();
    const task = await this.taskStorage.getTask(taskId);
    const sessions = await this.contextDb.getTaskSessions();

    const existingSession = sessions.find(
      (s) => s.taskId === taskId && s.status === TaskStatus.InProgress,
    );
    if (existingSession) {
      this.logger.warn(`Task ${taskId} already has an active session`);
      return;
    }

    if (!canTransition(task.status as TaskStatus, TaskStatus.InProgress)) {
      this.logger.warn(`Cannot transition task ${taskId} from ${task.status} to in_progress`);
      return;
    }

    const session = await this.agentProvider.createSession({
      taskId,
      prompt: `Implement task: ${task.name}\n\n${task.description}`,
      workingDirectory: process.cwd(),
    });

    await this.taskStorage.updateTask(taskId, { status: TaskStatus.InProgress });

    this.eventBus.emit('task.started', { taskId, agentSessionId: session.id });
    this.logger.log(`Task ${taskId} started with agent session ${session.id}`);
  }

  async reviewTask(taskId: string): Promise<void> {
    this.logger.log(`Reviewing task: ${taskId}`);
    // TODO: Implement review logic - run tests, check quality
  }

  async approveTask(taskId: string): Promise<void> {
    this.logger.log(`Approving task: ${taskId}`);

    if (!canTransition(TaskStatus.Completed, TaskStatus.Approved)) {
      this.logger.warn(`Cannot approve task ${taskId}`);
      return;
    }

    await this.taskStorage.updateTask(taskId, { status: TaskStatus.Approved });
    this.eventBus.emit('task.approved', { taskId });
  }

  async createPRForTask(taskId: string): Promise<void> {
    this.logger.log(`Creating PR for task: ${taskId}`);

    const task = await this.taskStorage.getTask(taskId);
    const session = await this.contextDb.getTaskSessions();
    const taskSession = session.find((s) => s.taskId === taskId);

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

    await this.taskStorage.updateTask(taskId, { status: TaskStatus.PrCreated });
    this.eventBus.emit('task.pr_created', { taskId, prNumber: pr.number, prUrl: pr.url });
  }

  async scheduleNextTask(): Promise<string | null> {
    this.logger.log('Scheduling next task');

    const schedule = await this.contextDb.getSchedule();
    const nextPending = schedule.find(
      (entry) => entry.retryCount < entry.maxRetries,
    );

    if (!nextPending) {
      this.logger.log('No pending tasks found');
      return null;
    }

    await this.startTask(nextPending.taskId);
    return nextPending.taskId;
  }

  async getOrchestrationStatus(): Promise<{ pendingTasks: number; activeTasks: number; completedTasks: number }> {
    const sessions = await this.contextDb.getTaskSessions();
    const schedule = await this.contextDb.getSchedule();

    return {
      pendingTasks: schedule.filter((e) => e.agentSessionId === undefined).length,
      activeTasks: sessions.filter((s) => s.status === TaskStatus.InProgress).length,
      completedTasks: sessions.filter((s) => s.status === TaskStatus.Done).length,
    };
  }
}