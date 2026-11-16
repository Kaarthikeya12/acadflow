import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { requirePageRole } from '@/lib/authz/guards';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await requirePageRole('admin');
  return <AppShell viewer={viewer}>{children}</AppShell>;
}
