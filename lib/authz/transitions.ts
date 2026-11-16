/**
 * Status transition rules from Appendix B. A transition not listed here is
 * rejected by the server before it reaches SQL.
 */

const OFFERING_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['active', 'archived'],
  active: ['closed'],
  closed: ['archived'],
  archived: [],
};

const ENROLLMENT_TRANSITIONS: Record<string, readonly string[]> = {
  active: ['dropped', 'completed'],
  dropped: ['active'],
  completed: [],
};

const ASSIGNMENT_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['published', 'closed'],
  published: ['closed'],
  closed: [],
};

export function canTransitionOffering(from: string, to: string): boolean {
  if (from === to) return true;
  return (OFFERING_TRANSITIONS[from] ?? []).includes(to);
}

export function canTransitionEnrollment(from: string, to: string): boolean {
  if (from === to) return true;
  return (ENROLLMENT_TRANSITIONS[from] ?? []).includes(to);
}

export function canTransitionAssignment(from: string, to: string): boolean {
  if (from === to) return true;
  return (ASSIGNMENT_TRANSITIONS[from] ?? []).includes(to);
}
