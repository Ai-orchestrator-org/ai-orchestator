import { TaskStatus } from '@ai-orchestrator/shared';

export interface StateTransition {
  from: TaskStatus;
  to: TaskStatus;
  event: string;
}

export const TASK_STATE_MACHINE: StateTransition[] = [
  { from: TaskStatus.Pending, to: TaskStatus.Ready, event: 'task.decomposed' },
  { from: TaskStatus.Pending, to: TaskStatus.Blocked, event: 'task.dependencies_unmet' },
  { from: TaskStatus.Ready, to: TaskStatus.InProgress, event: 'task.agent_assigned' },
  { from: TaskStatus.Ready, to: TaskStatus.Blocked, event: 'task.blocked' },
  { from: TaskStatus.InProgress, to: TaskStatus.Completed, event: 'task.completed' },
  { from: TaskStatus.InProgress, to: TaskStatus.NeedsIntervention, event: 'task.agent_failed' },
  { from: TaskStatus.Completed, to: TaskStatus.Approved, event: 'task.review_approved' },
  { from: TaskStatus.Completed, to: TaskStatus.NeedsRevision, event: 'task.review_rejected' },
  { from: TaskStatus.NeedsRevision, to: TaskStatus.InProgress, event: 'task.rework_started' },
  { from: TaskStatus.Approved, to: TaskStatus.PrCreated, event: 'task.pr_created' },
  { from: TaskStatus.PrCreated, to: TaskStatus.Done, event: 'task.pr_merged' },
  { from: TaskStatus.NeedsIntervention, to: TaskStatus.InProgress, event: 'task.agent_restarted' },
  { from: TaskStatus.NeedsIntervention, to: TaskStatus.Blocked, event: 'task.manual_block' },
  { from: TaskStatus.Blocked, to: TaskStatus.Ready, event: 'task.unblocked' },
];

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_STATE_MACHINE.some((t) => t.from === from && t.to === to);
}

export function getNextStates(current: TaskStatus): TaskStatus[] {
  return TASK_STATE_MACHINE
    .filter((t) => t.from === current)
    .map((t) => t.to);
}