import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { TaskLifecycleService } from './task-lifecycle.service';

@Module({
  providers: [OrchestratorService, TaskLifecycleService],
  exports: [OrchestratorService, TaskLifecycleService],
})
export class OrchestratorModule {}