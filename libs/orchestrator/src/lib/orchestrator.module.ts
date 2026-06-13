import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { TASK_STORAGE } from '@ai-orchestrator/core-interfaces';
import { AGENT_PROVIDER } from '@ai-orchestrator/core-interfaces';
import { CONTEXT_DB } from '@ai-orchestrator/core-interfaces';
import { EVENT_BUS } from '@ai-orchestrator/core-interfaces';
import { TEST_RUNNER } from '@ai-orchestrator/core-interfaces';
import { PR_PROVIDER } from '@ai-orchestrator/core-interfaces';

@Module({
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}