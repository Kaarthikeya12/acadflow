import { requirePageRole } from '@/lib/authz/guards';
import { listStudentSchedule } from '@/lib/data/student';
import {
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
} from '@/components/ui';
import {
  formatDate,
  formatRelative,
  formatTime,
  formatWeekday,
  isPast as isPastDate,
} from '@/components/format';
import type { StudentScheduleItemDTO } from '@/types/contracts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Class schedule' };

function groupByDay(items: StudentScheduleItemDTO[]): Array<{ key: string; label: string; items: StudentScheduleItemDTO[] }> {
  const groups = new Map<string, StudentScheduleItemDTO[]>();
  for (const item of items) {
    const key = new Intl.DateTimeFormat('en-CA', {
      timeZone: process.env.APP_TIMEZONE?.trim() || 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(item.startsAt));
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }
  return Array.from(groups.entries()).map(([key, group]) => {
    const first = group[0]!;
    return {
      key,
      label: `${formatWeekday(first.startsAt)}, ${formatDate(first.startsAt)}`,
      items: group,
    };
  });
}

export default async function StudentSchedulePage() {
  const viewer = await requirePageRole('student');
  const sessions = await listStudentSchedule(viewer);
  const days = groupByDay(sessions);
  const upcoming = sessions.filter((session) => !isPastDate(session.startsAt));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="My semester"
        title="Class schedule"
        description="Scheduled sessions for every course you are enrolled in, in institution time."
        actions={
          <ButtonLink href="/student/courses" variant="secondary" size="sm">
            My courses
          </ButtonLink>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Scheduled sessions</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{sessions.length}</p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Still ahead</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{upcoming.length}</p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-5">
          <p className="eyebrow">Active courses</p>
          <p className="mt-3 font-display text-3xl font-semibold tabular-nums">
            {new Set(sessions.map((session) => session.offeringId)).size}
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title="No scheduled classes"
          description="Once faculty schedule sessions for your offerings, they will appear here."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {days.map((day) => (
            <Card key={day.key}>
              <CardHeader
                title={day.label}
                description={`${day.items.length} ${day.items.length === 1 ? 'session' : 'sessions'}`}
              />
              <ul className="divide-y divide-line">
                {day.items.map((session) => {
                  const past = isPastDate(session.startsAt);
                  return (
                    <li key={session.sessionId} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                      <div className="flex min-w-0 gap-4">
                        <div className="w-20 shrink-0 border-r border-line pr-3 text-xs">
                          <p className="font-semibold">{formatTime(session.startsAt)}</p>
                          <p className="mt-0.5 text-muted">
                            {session.endsAt ? formatTime(session.endsAt) : '—'}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{session.topic}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {session.courseCode} · {session.courseTitle}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">{session.facultyName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {past ? <Badge tone="neutral">Past</Badge> : <Badge tone="info">{formatRelative(session.startsAt)}</Badge>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
