import { Injectable, Logger } from '@nestjs/common';
import { AGENT_PROVIDER, IAgentProvider } from '@ai-orchestrator/core-interfaces';
import { AgentSessionCreateInput, AgentSessionResult } from '@ai-orchestrator/shared';

@Injectable()
export class OpencodeAdapterService implements IAgentProvider {
  private readonly logger = new Logger(OpencodeAdapterService.name);

  async createSession(input: AgentSessionCreateInput): Promise<AgentSessionResult> {
    this.logger.log(`Creating agent session for task: ${input.taskId}`);
    // TODO: Implement with @opencode-ai/sdk
    throw new Error('Not implemented: OpencodeAdapterService.createSession');
  }

  async sendPrompt(sessionId: string, prompt: string): Promise<string> {
    this.logger.log(`Sending prompt to session: ${sessionId}`);
    // TODO: Implement with @opencode-ai/sdk
    throw new Error('Not implemented: OpencodeAdapterService.sendPrompt');
  }

  async getSession(sessionId: string): Promise<AgentSessionResult> {
    this.logger.log(`Getting session: ${sessionId}`);
    // TODO: Implement with @opencode-ai/sdk
    throw new Error('Not implemented: OpencodeAdapterService.getSession');
  }

  async abortSession(sessionId: string): Promise<void> {
    this.logger.log(`Aborting session: ${sessionId}`);
    // TODO: Implement with @opencode-ai/sdk
    throw new Error('Not implemented: OpencodeAdapterService.abortSession');
  }

  async getDiff(sessionId: string): Promise<string> {
    this.logger.log(`Getting diff for session: ${sessionId}`);
    // TODO: Implement with @opencode-ai/sdk
    throw new Error('Not implemented: OpencodeAdapterService.getDiff');
  }

  async grantPermission(sessionId: string, permission: string): Promise<void> {
    this.logger.log(`Granting permission ${permission} for session: ${sessionId}`);
    // TODO: Implement with @opencode-ai/sdk
    throw new Error('Not implemented: OpencodeAdapterService.grantPermission');
  }

  async onSessionEvent(sessionId: string, callback: (event: unknown) => void): Promise<() => void> {
    this.logger.log(`Subscribing to events for session: ${sessionId}`);
    // TODO: Implement with @opencode-ai/sdk
    throw new Error('Not implemented: OpencodeAdapterService.onSessionEvent');
  }
}