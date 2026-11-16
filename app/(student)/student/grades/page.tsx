import { requirePageRole } from '@/lib/authz/guards';
import { getStudentGrades } from '@/lib/data/student';
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  TableShell,
  Td,
  Th,
} from '@/components/ui';
import { formatDateTime, formatPercent } from '@/components/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My grades' };

export default async function StudentGradesPage() {
  const viewer = await requirePageRole('student');
  const grades = await getStudentGrades(viewer);

  const published = grades.filter((grade) => grade.status === 'published');
  const withFinal = published.filter((grade) => grade.finalPercent !== null);
  const average =
    withFinal.length > 0
      ? (
          withFinal.reduce((sum, grade) => sum + Number(grade.finalPercent), 0) / withFinal.length
        ).toFixed(2)
      : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Coursework"
        title="My grades"
        description="Final results published by your faculty. Draft grades are not shown here."
        actions={
          <ButtonLink href="/student/attendance" variant="secondary" size="sm">
            Attendance record
          </ButtonLink>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Published results</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{published.length}</p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Courses with a final mark</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{withFinal.length}</p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Mean final percent</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">
            {average ? `${average}%` : '—'}
          </p>
        </div>
      </div>

      {published.length === 0 ? (
        <EmptyState
          title="No published grades yet"
          description="Final results appear after your faculty compute and publish them for a course."
        />
      ) : (
        <Card>
          <CardHeader
            title="Published final grades"
            description="Attendance and coursework contributions are shown exactly as stored in the record."
            action={<Badge tone="success">Official</Badge>}
          />
          <TableShell className="rounded-none border-0">
            <thead>
              <tr>
                <Th>Course</Th>
                <Th align="right">Attendance</Th>
                <Th align="right">Coursework</Th>
                <Th align="right">Final</Th>
                <Th>Letter</Th>
                <Th>Published</Th>
              </tr>
            </thead>
            <tbody>
              {published.map((grade) => (
                <tr key={grade.enrollmentId} className="hover:bg-surface/70">
                  <Td className="font-mono text-xs font-medium">{grade.courseCode}</Td>
                  <Td align="right" className="tabular-nums">{formatPercent(grade.attendancePercent)}</Td>
                  <Td align="right" className="tabular-nums">{formatPercent(grade.courseworkPercent)}</Td>
                  <Td align="right" className="font-medium tabular-nums">{formatPercent(grade.finalPercent)}</Td>
                  <Td className="font-mono text-xs">{grade.letterGrade ?? '—'}</Td>
                  <Td className="text-xs text-muted">
                    {grade.publishedAt ? formatDateTime(grade.publishedAt) : '—'}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Card>
      )}

      <Alert tone="neutral" title="How final grades are produced">
        Final percent is computed from the active grade policy for the term, combining attendance and
        coursework weights. Letter grades follow the configured boundaries. Only published results are
        visible here; if a course is missing, its grades have not been released yet.
      </Alert>
    </div>
  );
}
