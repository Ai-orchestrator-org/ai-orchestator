export class TaskCreatedEvent {
  constructor(
    public readonly taskId: string,
    public readonly taskName: string,
    public readonly listId: string,
    public readonly timestamp: string = new Date().toISOString(),
  ) {}
}

export class TaskStatusChangedEvent {
  constructor(
    public readonly taskId: string,
    public readonly previousStatus: string,
    public readonly newStatus: string,
    public readonly timestamp: string = new Date().toISOString(),
  ) {}
}

export class AgentSessionStartedEvent {
  constructor(
    public readonly agentSessionId: string,
    public readonly taskId: string,
    public readonly timestamp: string = new Date().toISOString(),
  ) {}
}

export class AgentSessionCompletedEvent {
  constructor(
    public readonly agentSessionId: string,
    public readonly taskId: string,
    public readonly diff: string,
    public readonly output: string,
    public readonly timestamp: string = new Date().toISOString(),
  ) {}
}

export class AgentSessionFailedEvent {
  constructor(
    public readonly agentSessionId: string,
    public readonly taskId: string,
    public readonly error: string,
    public readonly timestamp: string = new Date().toISOString(),
  ) {}
}

export class TestRunCompletedEvent {
  constructor(
    public readonly taskId: string,
    public readonly agentSessionId: string,
    public readonly passed: boolean,
    public readonly exitCode: number,
    public readonly output: string,
    public readonly timestamp: string = new Date().toISOString(),
  ) {}
}

export class PRCreatedEvent {
  constructor(
    public readonly taskId: string,
    public readonly prNumber: number,
    public readonly prUrl: string,
    public readonly timestamp: string = new Date().toISOString(),
  ) {}
}

export class OrchestrationErrorEvent {
  constructor(
    public readonly errorType: string,
    public readonly message: string,
    public readonly taskId?: string,
    public readonly agentSessionId?: string,
    public readonly timestamp: string = new Date().toISOString(),
  ) {}
}