import { Injectable, Inject, Logger } from '@nestjs/common';
import { TASK_STORAGE, ITaskStorage } from '@ai-orchestrator/core-interfaces';
import { AGENT_PROVIDER, IAgentProvider } from '@ai-orchestrator/core-interfaces';
import { CONTEXT_DB, IContextDB } from '@ai-orchestrator/core-interfaces';
import { EVENT_BUS, IEventBus } from '@ai-orchestrator/core-interfaces';
import { TEST_RUNNER, ITestRunner } from '@ai-orchestrator/core-interfaces';
import { PR_PROVIDER, IPRProvider } from '@ai-orchestrator/core-interfaces';
import { TaskStatus } from '@ai-orchestrator/shared';
import { TaskLifecycleService } from './task-lifecycle.service';

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
    private readonly lifecycleService: TaskLifecycleService,
  ) {}

  async startTask(taskId: string): Promise<void> {
    return this.lifecycleService.startTask(taskId);
  }

  async reviewTask(taskId: string): Promise<void> {
    return this.lifecycleService.reviewTask(taskId);
  }

  async approveTask(taskId: string): Promise<void> {
    return this.lifecycleService.approveTask(taskId);
  }

  async createPRForTask(taskId: string): Promise<void> {
    return this.lifecycleService.createPRForTask(taskId);
  }

  async enqueueTasks(listId: string): Promise<number> {
    return this.lifecycleService.enqueueTasks(listId);
  }

  async dequeueNextTask(): Promise<string | null> {
    return this.lifecycleService.dequeueNextTask();
  }

  async scheduleNextTask(): Promise<string | null> {
    return this.lifecycleService.dequeueNextTask();
  }

  async runSerialPipeline(): Promise<string | null> {
    return this.lifecycleService.runSerialPipeline();
  }

  async getOrchestrationStatus() {
    return this.lifecycleService.getOrchestrationStatus();
  }
}