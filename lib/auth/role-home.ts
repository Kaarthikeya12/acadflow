import type { Role } from '@/types/contracts';

export function roleHomePath(role: Role): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'faculty':
      return '/faculty/dashboard';
    case 'student':
      return '/student/dashboard';
  }
}
