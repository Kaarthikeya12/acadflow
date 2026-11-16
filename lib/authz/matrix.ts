import type { Role } from '@/types/contracts';

/**
 * Single source of truth for the capability matrix in contract §8.4.
 * Default deny: a capability not listed here is allowed for nobody.
 * Scope (which offering / which student) is enforced by ownership predicates.
 */
export type Capability =
  | 'manage:master_data'
  | 'manage:users'
  | 'manage:offerings'
  | 'manage:enrollments'
  | 'read:all_users'
  | 'read:offering'
  | 'read:roster'
  | 'read:attendance'
  | 'write:sessions'
  | 'write:attendance'
  | 'write:assignments'
  | 'read:assignment'
  | 'submit:assignment'
  | 'read:submission'
  | 'grade:submission'
  | 'release:grade'
  | 'read:audit'
  | 'read:reports'
  | 'read:own_records'
  | 'compute:final_grades'
  | 'publish:final_grades';

const CAPABILITY_ROLES: Record<Capability, readonly Role[]> = {
  'manage:master_data': ['admin'],
  'manage:users': ['admin'],
  'manage:offerings': ['admin'],
  'manage:enrollments': ['admin'],
  'read:all_users': ['admin'],
  'read:offering': ['admin', 'faculty', 'student'],
  'read:roster': ['admin', 'faculty'],
  'read:attendance': ['admin', 'faculty', 'student'],
  'write:sessions': ['faculty'],
  'write:attendance': ['faculty'],
  'write:assignments': ['faculty'],
  'read:assignment': ['admin', 'faculty', 'student'],
  'submit:assignment': ['student'],
  'read:submission': ['admin', 'faculty', 'student'],
  'grade:submission': ['faculty'],
  'release:grade': ['faculty'],
  'read:audit': ['admin', 'faculty'],
  'read:reports': ['admin'],
  'read:own_records': ['student'],
  'compute:final_grades': ['faculty'],
  'publish:final_grades': ['faculty'],
};

export function can(role: Role, capability: Capability): boolean {
  return CAPABILITY_ROLES[capability]?.includes(role) ?? false;
}

export function allowedRoles(capability: Capability): readonly Role[] {
  return CAPABILITY_ROLES[capability] ?? [];
}
