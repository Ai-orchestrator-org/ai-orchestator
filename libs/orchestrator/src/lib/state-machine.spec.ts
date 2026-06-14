import { TaskStatus } from '@ai-orchestrator/shared';
import {
  TASK_STATE_MACHINE,
  canTransition,
  getNextStates,
  getTransitionEvent,
  transitionTask,
  InvalidTransitionError,
} from './state-machine';

describe('state-machine', () => {
  describe('TASK_STATE_MACHINE', () => {
    it('should have 14 defined transitions', () => {
      expect(TASK_STATE_MACHINE).toHaveLength(14);
    });

    it('should have unique from+to pairs', () => {
      const pairs = TASK_STATE_MACHINE.map((t) => `${t.from}->${t.to}`);
      const unique = new Set(pairs);
      expect(unique.size).toBe(pairs.length);
    });
  });

  describe('canTransition', () => {
    it('should return true for valid transitions', () => {
      expect(canTransition(TaskStatus.Pending, TaskStatus.Ready)).toBe(true);
      expect(canTransition(TaskStatus.Ready, TaskStatus.InProgress)).toBe(true);
      expect(canTransition(TaskStatus.InProgress, TaskStatus.Completed)).toBe(true);
      expect(canTransition(TaskStatus.Completed, TaskStatus.Approved)).toBe(true);
      expect(canTransition(TaskStatus.Approved, TaskStatus.PrCreated)).toBe(true);
      expect(canTransition(TaskStatus.PrCreated, TaskStatus.Done)).toBe(true);
    });

    it('should return true for failure/retry transitions', () => {
      expect(canTransition(TaskStatus.InProgress, TaskStatus.NeedsIntervention)).toBe(true);
      expect(canTransition(TaskStatus.NeedsIntervention, TaskStatus.InProgress)).toBe(true);
      expect(canTransition(TaskStatus.NeedsIntervention, TaskStatus.Blocked)).toBe(true);
      expect(canTransition(TaskStatus.Blocked, TaskStatus.Ready)).toBe(true);
    });

    it('should return true for review transitions', () => {
      expect(canTransition(TaskStatus.Completed, TaskStatus.NeedsRevision)).toBe(true);
      expect(canTransition(TaskStatus.NeedsRevision, TaskStatus.InProgress)).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(canTransition(TaskStatus.Pending, TaskStatus.Done)).toBe(false);
      expect(canTransition(TaskStatus.Done, TaskStatus.InProgress)).toBe(false);
      expect(canTransition(TaskStatus.Blocked, TaskStatus.Done)).toBe(false);
      expect(canTransition(TaskStatus.PrCreated, TaskStatus.InProgress)).toBe(false);
    });

    it('should return false for same-status transitions', () => {
      expect(canTransition(TaskStatus.InProgress, TaskStatus.InProgress)).toBe(false);
      expect(canTransition(TaskStatus.Pending, TaskStatus.Pending)).toBe(false);
    });
  });

  describe('getNextStates', () => {
    it('should return multiple next states for InProgress', () => {
      const next = getNextStates(TaskStatus.InProgress);
      expect(next).toContain(TaskStatus.Completed);
      expect(next).toContain(TaskStatus.NeedsIntervention);
      expect(next).toHaveLength(2);
    });

    it('should return empty array for Done status', () => {
      const next = getNextStates(TaskStatus.Done);
      expect(next).toHaveLength(0);
    });

    it('should return single next state for PrCreated', () => {
      const next = getNextStates(TaskStatus.PrCreated);
      expect(next).toEqual([TaskStatus.Done]);
    });

    it('should return two next states for Pending', () => {
      const next = getNextStates(TaskStatus.Pending);
      expect(next).toContain(TaskStatus.Ready);
      expect(next).toContain(TaskStatus.Blocked);
    });

    it('should return two next states for Completed', () => {
      const next = getNextStates(TaskStatus.Completed);
      expect(next).toContain(TaskStatus.Approved);
      expect(next).toContain(TaskStatus.NeedsRevision);
    });
  });

  describe('getTransitionEvent', () => {
    it('should return event name for valid transitions', () => {
      expect(getTransitionEvent(TaskStatus.Pending, TaskStatus.Ready)).toBe('task.decomposed');
      expect(getTransitionEvent(TaskStatus.Ready, TaskStatus.InProgress)).toBe('task.agent_assigned');
      expect(getTransitionEvent(TaskStatus.InProgress, TaskStatus.Completed)).toBe('task.completed');
      expect(getTransitionEvent(TaskStatus.Completed, TaskStatus.Approved)).toBe('task.review_approved');
    });

    it('should return null for invalid transitions', () => {
      expect(getTransitionEvent(TaskStatus.Done, TaskStatus.InProgress)).toBeNull();
      expect(getTransitionEvent(TaskStatus.Pending, TaskStatus.Done)).toBeNull();
    });
  });

  describe('transitionTask', () => {
    it('should return a TransitionResult for valid transitions', () => {
      const result = transitionTask('task-1', TaskStatus.Pending, TaskStatus.Ready);

      expect(result.taskId).toBe('task-1');
      expect(result.from).toBe(TaskStatus.Pending);
      expect(result.to).toBe(TaskStatus.Ready);
      expect(result.event).toBe('task.decomposed');
      expect(result.timestamp).toBeTruthy();
    });

    it('should throw InvalidTransitionError for invalid transitions', () => {
      expect(() => transitionTask('task-1', TaskStatus.Done, TaskStatus.InProgress)).toThrow(InvalidTransitionError);
    });

    it('should include taskId and statuses in error', () => {
      try {
        transitionTask('task-1', TaskStatus.Done, TaskStatus.InProgress);
        fail('Expected InvalidTransitionError');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidTransitionError);
        expect((error as InvalidTransitionError).taskId).toBe('task-1');
        expect((error as InvalidTransitionError).from).toBe(TaskStatus.Done);
        expect((error as InvalidTransitionError).to).toBe(TaskStatus.InProgress);
      }
    });
  });
});