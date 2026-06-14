import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ITaskStorage } from '@ai-orchestrator/core-interfaces';
import { TaskCreateInput, TaskResult, TaskUpdateInput } from '@ai-orchestrator/shared';
import { CLICKUP_TOOL_MAPPINGS } from './tool-mappings';
import { parseCreateTaskResponse, parseGetTaskResponse, parseListTasksResponse, parseToolListResponse } from './response-parsers';

@Injectable()
export class McpTaskStorageService implements ITaskStorage, OnModuleInit {
  private readonly logger = new Logger(McpTaskStorageService.name);
  private client: InstanceType<typeof import('@modelcontextprotocol/sdk/client').Client> | null = null;
  private connected = false;
  private connectionError: string | null = null;
  private McpClientClass: (new (...args: unknown[]) => InstanceType<typeof import('@modelcontextprotocol/sdk/client').Client>) | null = null;
  private StreamableHTTPTransportClass: (new (...args: unknown[]) => unknown) | null = null;
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 5000;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.loadMcpModule();
    await this.connectWithRetry();
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConnectionError(): string | null {
    return this.connectionError;
  }

  private async loadMcpModule(): Promise<void> {
    const [clientModule, transportModule] = await Promise.all([
      import('@modelcontextprotocol/sdk/client'),
      import('@modelcontextprotocol/sdk/client/streamableHttp.js'),
    ]);
    this.McpClientClass = clientModule.Client;
    this.StreamableHTTPTransportClass = transportModule.StreamableHTTPClientTransport;
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
    this.logger.error(`Failed to connect to MCP server after ${this.maxRetries} attempts. Service will operate in degraded mode.`);
  }

  private async connect(): Promise<void> {
    const mcpServerUrl = this.configService.getOrThrow<string>('MCP_SERVER_URL');
    this.logger.log(`Connecting to MCP server at ${mcpServerUrl}`);

    try {
      if (!this.McpClientClass || !this.StreamableHTTPTransportClass) {
        throw new Error('MCP modules not loaded');
      }

      this.client = new this.McpClientClass({
        name: 'ai-orchestrator',
        version: '0.0.1',
      });

      const transport = new this.StreamableHTTPTransportClass!(new URL(mcpServerUrl)) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      await this.client.connect(transport);
      this.connected = true;
      this.logger.log('Connected to MCP server successfully');
    } catch (error) {
      this.logger.error(`Failed to connect to MCP server: ${error instanceof Error ? error.message : String(error)}`);
      this.connected = false;
    }
  }

  async createTask(input: TaskCreateInput): Promise<TaskResult> {
    const response = await this.callTool(CLICKUP_TOOL_MAPPINGS.createTask, {
      name: input.name,
      description: input.description,
      priority: input.priority,
      list_id: input.listId,
      assignee: input.assignee,
      tags: input.tags,
      due_date: input.dueDate,
    });
    return parseCreateTaskResponse(response);
  }

  async getTask(taskId: string): Promise<TaskResult> {
    const response = await this.callTool(CLICKUP_TOOL_MAPPINGS.getTask, {
      task_id: taskId,
    });
    return parseGetTaskResponse(response);
  }

  async updateTask(taskId: string, input: TaskUpdateInput): Promise<TaskResult> {
    const response = await this.callTool(CLICKUP_TOOL_MAPPINGS.updateTask, {
      task_id: taskId,
      ...input,
    });
    return parseGetTaskResponse(response);
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.callTool(CLICKUP_TOOL_MAPPINGS.deleteTask, {
      task_id: taskId,
    });
  }

  async listTasks(listId: string, filters?: Record<string, string>): Promise<TaskResult[]> {
    const response = await this.callTool(CLICKUP_TOOL_MAPPINGS.listTasks, {
      list_id: listId,
      ...filters,
    });
    return parseListTasksResponse(response);
  }

  async getAvailableTools(): Promise<string[]> {
    const response = await this.callTool(CLICKUP_TOOL_MAPPINGS.getAvailableTools, {});
    return parseToolListResponse(response);
  }

  private async callTool(toolName: string, args: Record<string, unknown>): Promise<string> {
    if (!this.client || !this.connected) {
      throw new Error('MCP client is not connected');
    }

    this.logger.debug(`Calling MCP tool: ${toolName}`);

    const result = await this.client.callTool({
      name: toolName,
      arguments: args,
    });

    const textContent = (result.content as Array<{ type: string; text?: string }>)
      .filter((c) => c.type === 'text' && c.text)
      .map((c) => c.text!)
      .join('\n');

    return textContent;
  }

  async reconnect(): Promise<void> {
    this.logger.warn('Reconnecting to MCP server...');
    this.connected = false;
    this.client = null;
    this.connectionError = null;
    await this.connectWithRetry();
  }
}