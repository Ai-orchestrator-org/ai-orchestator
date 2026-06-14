import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { OrchestratorService } from '@ai-orchestrator/orchestrator';

@Controller('api/orchestration')
export class OrchestrationController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post('start/:taskId')
  async startTask(@Param('taskId') taskId: string) {
    await this.orchestratorService.startTask(taskId);
    return { started: true, taskId };
  }

  @Post('review/:taskId')
  async reviewTask(@Param('taskId') taskId: string) {
    await this.orchestratorService.reviewTask(taskId);
    return { reviewed: true, taskId };
  }

  @Post('approve/:taskId')
  async approveTask(@Param('taskId') taskId: string) {
    await this.orchestratorService.approveTask(taskId);
    return { approved: true, taskId };
  }

  @Post('pr/:taskId')
  async createPR(@Param('taskId') taskId: string) {
    await this.orchestratorService.createPRForTask(taskId);
    return { prCreated: true, taskId };
  }

  @Post('enqueue')
  async enqueueTasks(@Body() body: { listId: string }) {
    const count = await this.orchestratorService.enqueueTasks(body.listId);
    return { enqueued: count, listId: body.listId };
  }

  @Post('run')
  async runPipeline(@Query('listId') listId?: string) {
    if (listId) {
      await this.orchestratorService.enqueueTasks(listId);
    }
    const taskId = await this.orchestratorService.runSerialPipeline();
    return { running: true, taskId };
  }

  @Get('status')
  async getStatus() {
    return this.orchestratorService.getOrchestrationStatus();
  }
}