import { Injectable, Logger } from '@nestjs/common';
import { PR_PROVIDER, IPRProvider } from '@ai-orchestrator/core-interfaces';
import { PRCreateInput, PRResult } from '@ai-orchestrator/shared';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class GhPrProviderService implements IPRProvider {
  private readonly logger = new Logger(GhPrProviderService.name);

  async createPullRequest(input: PRCreateInput): Promise<PRResult> {
    this.logger.log(`Creating PR: ${input.title}`);

    const draftFlag = input.draft ? '--draft' : '';
    const labelsFlag = input.labels?.length ? `--label "${input.labels.join(',')}"` : '';
    const reviewersFlag = input.reviewers?.length ? `--reviewer "${input.reviewers.join(',')}"` : '';

    const command = [
      'gh', 'pr', 'create',
      `--title "${input.title}"`,
      `--body "${input.body}"`,
      `--head "${input.head}"`,
      `--base "${input.base}"`,
      draftFlag,
      labelsFlag,
      reviewersFlag,
    ].filter(Boolean).join(' ');

    const { stdout } = await execAsync(command, { cwd: process.cwd() });
    const match = stdout.match(/pull\/(\d+)/);
    const prNumber = match ? parseInt(match[1], 10) : 0;

    return {
      number: prNumber,
      url: stdout.trim(),
      state: 'open',
      head: input.head,
      base: input.base,
    };
  }

  async getPullRequest(number: number): Promise<PRResult> {
    this.logger.log(`Getting PR #${number}`);
    const { stdout } = await execAsync(`gh pr view ${number} --json number,url,state,headRefName,baseRefName`, { cwd: process.cwd() });
    const data = JSON.parse(stdout);

    return {
      number: data.number,
      url: data.url,
      state: data.state,
      head: data.headRefName,
      base: data.baseRefName,
    };
  }

  async listPullRequests(state: 'open' | 'closed' | 'all' = 'open'): Promise<PRResult[]> {
    this.logger.log(`Listing PRs with state: ${state}`);
    const { stdout } = await execAsync(`gh pr list --state ${state} --json number,url,state,headRefName,baseRefName`, { cwd: process.cwd() });
    const data = JSON.parse(stdout);

    return data.map((pr: { number: number; url: string; state: string; headRefName: string; baseRefName: string }) => ({
      number: pr.number,
      url: pr.url,
      state: pr.state,
      head: pr.headRefName,
      base: pr.baseRefName,
    }));
  }

  async mergePullRequest(number: number): Promise<PRResult> {
    this.logger.log(`Merging PR #${number}`);
    await execAsync(`gh pr merge ${number} --merge`, { cwd: process.cwd() });
    return this.getPullRequest(number);
  }
}