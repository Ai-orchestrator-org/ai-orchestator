import { Module } from '@nestjs/common';
import { OpencodeAdapterService } from './opencode-adapter.service';
import { AGENT_PROVIDER } from '@ai-orchestrator/core-interfaces';

@Module({
  providers: [
    {
      provide: AGENT_PROVIDER,
      useClass: OpencodeAdapterService,
    },
  ],
  exports: [AGENT_PROVIDER],
})
export class OpencodeAdapterModule {}