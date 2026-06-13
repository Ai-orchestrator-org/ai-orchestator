import { Module } from '@nestjs/common';
import { ShellTestRunnerService } from './shell-test-runner.service';
import { TEST_RUNNER } from '@ai-orchestrator/core-interfaces';

@Module({
  providers: [
    {
      provide: TEST_RUNNER,
      useClass: ShellTestRunnerService,
    },
  ],
  exports: [TEST_RUNNER],
})
export class ShellTestRunnerModule {}