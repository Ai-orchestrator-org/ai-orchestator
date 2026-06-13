export interface TaskId {
  id: string;
  providerId: string;
}

export interface AgentTaskMapping {
  taskId: string;
  agentSessionId: string;
  status: TaskStatus;
  assignedAt: string;
  updatedAt: string;
}

export interface TaskCreateInput {
  name: string;
  description: string;
  priority: TaskPriority;
  listId: string;
  assignee?: string;
  tags?: string[];
  dueDate?: string;
}

export interface TaskUpdateInput {
  name?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  tags?: string[];
  dueDate?: string;
}

export interface TaskResult {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  listId: string;
  url?: string;
  assignee?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentSessionCreateInput {
  taskId: string;
  prompt: string;
  workingDirectory?: string;
  permissions?: Record<string, boolean>;
}

export interface AgentSessionResult {
  id: string;
  taskId: string;
  status: AgentStatus;
  diff?: string;
  output?: string;
  startedAt: string;
  completedAt?: string;
}

export interface TestRunInput {
  command: string;
  workingDirectory?: string;
  timeout?: number;
  env?: Record<string, string>;
}

export interface TestRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  passed: boolean;
}

export interface PRCreateInput {
  title: string;
  body: string;
  head: string;
  base: string;
  draft?: boolean;
  labels?: string[];
  reviewers?: string[];
}

export interface PRResult {
  number: number;
  url: string;
  state: string;
  head: string;
  base: string;
}

export interface OrchestrationConfig {
  teamId: string;
  spaceId: string;
  folderId: string;
  listIds: Record<string, string>;
  mcpServerUrl: string;
  opencodeServerUrl: string;
  orchestratorPort: number;
}

export interface ScheduleEntry {
  taskId: string;
  scheduledAt: string;
  agentSessionId?: string;
  retryCount: number;
  maxRetries: number;
}

export interface ContextData {
  config: OrchestrationConfig;
  schedule: ScheduleEntry[];
  taskSessions: AgentTaskMapping[];
}