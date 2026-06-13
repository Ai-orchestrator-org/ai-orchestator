import { Injectable, Logger } from '@nestjs/common';
import { TEST_RUNNER, ITestRunner } from '@ai-orchestrator/core-interfaces';
import { TestRunInput, TestRunResult } from '@ai-orchestrator/shared';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class ShellTestRunnerService implements ITestRunner {
  private readonly logger = new Logger(ShellTestRunnerService.name);

  async run(input: TestRunInput): Promise<TestRunResult> {
    this.logger.log(`Running command: ${input.command}`);
    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync(input.command, {
        cwd: input.workingDirectory,
        timeout: input.timeout ?? 300_000,
        env: { ...process.env, ...input.env },
      });

      const duration = Date.now() - startTime;

      return {
        exitCode: 0,
        stdout,
        stderr,
        duration,
        passed: true,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const execError = error as { stdout?: string; stderr?: string; code?: number };

      return {
        exitCode: execError.code ?? 1,
        stdout: execError.stdout ?? '',
        stderr: execError.stderr ?? error instanceof Error ? error.message : String(error),
        duration,
        passed: false,
      };
    }
  }
}