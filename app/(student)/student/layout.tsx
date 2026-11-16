import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { requirePageRole } from '@/lib/authz/guards';

export const dynamic = 'force-dynamic';

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const viewer = await requirePageRole('student');
  return <AppShell viewer={viewer}>{children}</AppShell>;
}
