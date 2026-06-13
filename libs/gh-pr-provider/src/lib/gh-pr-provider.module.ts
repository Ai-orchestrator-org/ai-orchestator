import { Module } from '@nestjs/common';
import { GhPrProviderService } from './gh-pr-provider.service';
import { PR_PROVIDER } from '@ai-orchestrator/core-interfaces';

@Module({
  providers: [
    {
      provide: PR_PROVIDER,
      useClass: GhPrProviderService,
    },
  ],
  exports: [PR_PROVIDER],
})
export class GhPrProviderModule {}