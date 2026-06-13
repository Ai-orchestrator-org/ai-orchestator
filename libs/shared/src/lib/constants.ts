export const TaskStatus = {
  Pending: 'pending',
  Ready: 'ready',
  Blocked: 'blocked',
  InProgress: 'in_progress',
  Completed: 'completed',
  Approved: 'approved',
  NeedsRevision: 'needs_revision',
  NeedsIntervention: 'needs_intervention',
  PrCreated: 'pr_created',
  Done: 'done',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  Urgent: 'urgent',
  High: 'high',
  Normal: 'normal',
  Low: 'low',
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const AgentStatus = {
  Idle: 'idle',
  Running: 'running',
  WaitingPermission: 'waiting_permission',
  Completed: 'completed',
  Failed: 'failed',
  Aborted: 'aborted',
} as const;
export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];