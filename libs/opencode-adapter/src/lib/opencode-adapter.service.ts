import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAgentProvider, AgentSessionEvent } from '@ai-orchestrator/core-interfaces';
import {
  AgentSessionCreateInput,
  AgentSessionResult,
  AgentStatus,
  AgentSessionDiff,
} from '@ai-orchestrator/shared';

type OpencodeClient = import('@opencode-ai/sdk').OpencodeClient;

@Injectable()
export class OpencodeAdapterService implements IAgentProvider, OnModuleInit {
  private readonly logger = new Logger(OpencodeAdapterService.name);
  private client: OpencodeClient | null = null;
  private connected = false;
  private connectionError: string | null = null;
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 5000;
  private directory: string;

  constructor(private readonly configService: ConfigService) {
    this.directory = process.cwd();
  }

  async onModuleInit(): Promise<void> {
    this.directory = this.configService.get<string>('OPENCODE_DIRECTORY') ?? process.cwd();
    await this.connectWithRetry();
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConnectionError(): string | null {
    return this.connectionError;
  }

  private async ensureClient(): Promise<OpencodeClient> {
    if (!this.client || !this.connected) {
      throw new Error('OpenCode client is not connected');
    }
    return this.client;
  }

  private async connectWithRetry(): Promise<void> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.connect();
        return;
      } catch (error) {
        this.connectionError = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Connection attempt ${attempt}/${this.maxRetries} failed: ${this.connectionError}`);
        if (attempt < this.maxRetries) {
          this.logger.log(`Retrying in ${this.retryDelayMs / 1000}s...`);
          await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
        }
      }
    }
    this.logger.error(`Failed to connect to OpenCode server after ${this.maxRetries} attempts. Operating in degraded mode.`);
  }

  private async connect(): Promise<void> {
    const baseUrl = this.configService.getOrThrow<string>('OPENCODE_SERVER_URL');
    this.logger.log(`Connecting to OpenCode server at ${baseUrl}`);

    try {
      const { createOpencodeClient } = await import('@opencode-ai/sdk');
      this.client = createOpencodeClient({
        baseUrl,
        directory: this.directory,
      });
      this.connected = true;
      this.connectionError = null;
      this.logger.log('Connected to OpenCode server successfully');
    } catch (error) {
      this.logger.error(`Failed to connect to OpenCode server: ${error instanceof Error ? error.message : String(error)}`);
      this.connected = false;
      throw error;
    }
  }

  async reconnect(): Promise<void> {
    this.logger.warn('Reconnecting to OpenCode server...');
    this.connected = false;
    this.client = null;
    this.connectionError = null;
    await this.connectWithRetry();
  }

  async createSession(input: AgentSessionCreateInput): Promise<AgentSessionResult> {
    const client = await this.ensureClient();

    const sessionResponse = await client.session.create({
      body: { title: `Task: ${input.taskId}` },
      query: { directory: input.workingDirectory ?? this.directory },
    });

    if (!sessionResponse.data) {
      throw new Error(`Failed to create session for task ${input.taskId}`);
    }

    const session = sessionResponse.data as { id: string; time: { created: number } };

    if (input.prompt) {
      await client.session.promptAsync({
        path: { id: session.id },
        body: {
          parts: [{ type: 'text', text: input.prompt }],
          ...(input.agent ? { agent: input.agent } : {}),
          ...(input.model ? { model: { providerID: '', modelID: input.model } } : {}),
        },
        query: { directory: input.workingDirectory ?? this.directory },
      });
    }

    return {
      id: session.id,
      taskId: input.taskId,
      status: AgentStatus.Running,
      startedAt: new Date(session.time.created).toISOString(),
      directory: input.workingDirectory ?? this.directory,
    };
  }

  async sendPrompt(sessionId: string, prompt: string): Promise<string> {
    const client = await this.ensureClient();

    await client.session.promptAsync({
      path: { id: sessionId },
      body: {
        parts: [{ type: 'text', text: prompt }],
      },
      query: { directory: this.directory },
    });

    return sessionId;
  }

  async getSession(sessionId: string): Promise<AgentSessionResult> {
    const client = await this.ensureClient();

    const response = await client.session.get({
      path: { id: sessionId },
      query: { directory: this.directory },
    });

    if (!response.data) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const session = response.data as {
      id: string;
      title: string;
      directory: string;
      summary?: { additions: number; deletions: number; files: number };
      time: { created: number; updated: number };
    };

    return {
      id: session.id,
      taskId: session.id,
      status: AgentStatus.Running,
      startedAt: new Date(session.time.created).toISOString(),
      title: session.title,
      directory: session.directory,
    };
  }

  async getSessionStatus(sessionId: string): Promise<Record<string, unknown>> {
    const client = await this.ensureClient();

    const response = await client.session.status({
      query: { directory: this.directory },
    });

    return (response.data as Record<string, unknown>) ?? {};
  }

  async listSessions(): Promise<AgentSessionResult[]> {
    const client = await this.ensureClient();

    const response = await client.session.list({
      query: { directory: this.directory },
    });

    if (!response.data) {
      return [];
    }

    const sessions = response.data as Array<{
      id: string;
      title: string;
      directory: string;
      time: { created: number; updated: number };
    }>;

    return sessions.map((s) => ({
      id: s.id,
      taskId: s.id,
      status: AgentStatus.Idle,
      startedAt: new Date(s.time.created).toISOString(),
      title: s.title,
      directory: s.directory,
    }));
  }

  async abortSession(sessionId: string): Promise<void> {
    const client = await this.ensureClient();

    await client.session.abort({
      path: { id: sessionId },
      query: { directory: this.directory },
    });
  }

  async getDiff(sessionId: string): Promise<string> {
    const client = await this.ensureClient();

    const response = await client.session.diff({
      path: { id: sessionId },
      query: { directory: this.directory },
    });

    if (!response.data) {
      return '';
    }

    const diffs = response.data as AgentSessionDiff[];

    return diffs
      .map((d) => `--- a/${d.file}\n+++ b/${d.file}\n${d.before}\n${d.after}`)
      .join('\n');
  }

  async grantPermission(sessionId: string, permissionId: string, response: 'once' | 'always' | 'reject'): Promise<void> {
    const client = await this.ensureClient();

    await client.postSessionIdPermissionsPermissionId({
      path: { id: sessionId, permissionID: permissionId },
      body: { response },
      query: { directory: this.directory },
    });
  }

  async onSessionEvent(callback: (event: AgentSessionEvent) => void): Promise<() => void> {
    const client = await this.ensureClient();

    const eventStream = await client.event.subscribe({
      query: { directory: this.directory },
    });

    let aborted = false;

    const processStream = async () => {
      try {
        for await (const value of eventStream.stream) {
          if (aborted) break;

          const event: AgentSessionEvent = {
            type: (value as Record<string, unknown>).type as string ?? 'unknown',
            data: value,
          };

          callback(event);
        }
      } catch (error) {
        if (!aborted) {
          this.logger.error(`Event stream error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };

    processStream();

    return () => {
      aborted = true;
    };
  }
}