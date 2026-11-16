import { requirePageRole } from '@/lib/authz/guards';
import { listAdminTerms } from '@/lib/data/admin';
import {
  SetCurrentTermButton,
  TermCreateForm,
  TermEditForm,
} from '@/components/admin/master-data-forms';
import { Disclosure } from '@/components/form';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from '@/components/ui';
import { formatDate } from '@/components/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Academic terms' };

export default async function AdminTermsPage() {
  const viewer = await requirePageRole('admin');
  const terms = await listAdminTerms(viewer);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Academic setup"
        title="Academic terms"
        description="Terms anchor offerings, grading policy and reporting. Exactly one term can be current at a time."
      />

      <Card>
        <CardHeader
          title="Add an academic term"
          description="Use the institution’s own year and term numbering."
        />
        <div className="p-5">
          <TermCreateForm />
        </div>
      </Card>

      {terms.length === 0 ? (
        <EmptyState
          title="No academic terms yet"
          description="Create the first term before opening course offerings."
        />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Academic year</Th>
              <Th>Term</Th>
              <Th>Dates</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {terms.map((term) => (
              <tr key={term.id} className="align-top hover:bg-surface/70">
                <Td className="font-mono text-xs">{term.academicYear}</Td>
                <Td>
                  <p className="font-medium">{term.label}</p>
                  <p className="text-xs text-muted">Term {term.termNo}</p>
                  <div className="mt-2">
                    <Disclosure summary="Edit term" tone="ghost">
                      <TermEditForm term={term} />
                    </Disclosure>
                  </div>
                </Td>
                <Td className="text-xs text-muted">
                  {formatDate(term.startsOn)}
                  <span className="block">{formatDate(term.endsOn)}</span>
                </Td>
                <Td>
                  {term.isCurrent ? <Badge tone="success">Current</Badge> : <StatusBadge status="inactive" />}
                </Td>
                <Td align="right">{term.isCurrent ? null : <SetCurrentTermButton id={term.id} />}</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <p className="text-xs leading-relaxed text-muted">
        <Badge tone="warning">Careful</Badge> Setting a new current term does not move existing
        offerings. Use it as the reference point for new setup and reports.
      </p>
    </div>
  );
}
