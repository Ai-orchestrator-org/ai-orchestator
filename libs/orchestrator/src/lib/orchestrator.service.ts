import { Injectable } from '@nestjs/common';
import { TaskLifecycleService } from './task-lifecycle.service';

@Injectable()
export class OrchestratorService {
  constructor(private readonly lifecycleService: TaskLifecycleService) {}

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