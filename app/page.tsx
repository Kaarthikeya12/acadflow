import Link from 'next/link';
import { getSessionUser } from '@/lib/auth/session';
import { roleHomePath } from '@/lib/auth/role-home';
import { PublicFooter, PublicHeader } from '@/components/public-chrome';
import {
  ArrowRightIcon,
  BookIcon,
  CalendarIcon,
  CapIcon,
  ChartIcon,
  CheckIcon,
  ClipboardIcon,
  FileIcon,
  ShieldIcon,
  SparkIcon,
  UsersIcon,
} from '@/components/icons';
import { ButtonLink, DotTag } from '@/components/ui';

export const dynamic = 'force-dynamic';

const ROLE_CARDS = [
  {
    role: 'Admin',
    icon: UsersIcon,
    summary: 'Keep the academic structure accurate and the semester moving.',
    points: [
      'Departments, courses and academic terms',
      'Faculty, student and enrollment records',
      'Reports and grade audit history',
    ],
    accent: 'bg-accent-yellow',
  },
  {
    role: 'Faculty',
    icon: BookIcon,
    summary: 'Run the courses you teach without leaving the workspace.',
    points: [
      'Class sessions and attendance rosters',
      'Assignments, submissions and grading',
      'Gradebook with audited mark changes',
    ],
    accent: 'bg-accent-orange',
  },
  {
    role: 'Student',
    icon: CapIcon,
    summary: 'See exactly what is due, what is next, and how you are doing.',
    points: [
      'Timetable and assignment deadlines',
      'Submission status and released marks',
      'Attendance percentage by course',
    ],
    accent: 'bg-accent-red',
  },
];

const FEATURES = [
  {
    icon: CalendarIcon,
    title: 'Timetable that matches reality',
    body: 'Sessions are scheduled per offering and surface only to enrolled students and the assigned faculty member.',
  },
  {
    icon: ClipboardIcon,
    title: 'Attendance with a clear trail',
    body: 'Mark a full roster in one save. Percentages are calculated from institutional policy, never guessed by the interface.',
  },
  {
    icon: FileIcon,
    title: 'Assignments in one lifecycle',
    body: 'Create, publish, accept submissions, grade and release — with late status derived from real timestamps.',
  },
  {
    icon: ChartIcon,
    title: 'Gradebook you can defend',
    body: 'Every mark change records the old value, the new value, the actor and the reason.',
  },
  {
    icon: ShieldIcon,
    title: 'Permission-checked by default',
    body: 'Roles and ownership are verified on the server for every page, record and download.',
  },
  {
    icon: SparkIcon,
    title: 'Designed for daily work',
    body: 'Quiet surfaces, data-first tables and useful empty states — no decorative dashboards full of invented numbers.',
  },
];

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[480px]" aria-hidden>
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-surface" />
      <div className="dot-field absolute -right-4 -top-4 -z-10 h-24 w-24 rounded-xl" />
      <div className="rounded-xl border border-line bg-paper p-4 shadow-[0_24px_60px_-36px_rgba(17,17,17,0.35)]">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent-orange" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Semester workspace
            </span>
          </div>
          <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">
            Live data
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            ['Courses', BookIcon],
            ['Sessions', CalendarIcon],
            ['Grading', ChartIcon],
          ].map(([label, Icon]) => {
            const Component = Icon as typeof BookIcon;
            return (
              <div key={String(label)} className="rounded-lg border border-line bg-surface p-2.5">
                <Component size={15} className="text-muted" />
                <p className="mt-2 text-[10px] font-medium text-muted">{String(label)}</p>
                <div className="mt-1.5 h-1 w-8 rounded-full bg-line-strong" />
              </div>
            );
          })}
        </div>

        <div className="mt-3 rounded-lg border border-line">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="text-[11px] font-semibold text-ink">This week</span>
            <span className="text-[10px] text-muted">Institution time</span>
          </div>
          {[
            ['Class session', 'Scheduled', 'bg-info'],
            ['Assignment due', 'Open', 'bg-accent-yellow'],
            ['Attendance', 'Saved', 'bg-success'],
            ['Marks released', 'Published', 'bg-success'],
          ].map(([title, status, dot], index) => (
            <div
              key={title}
              className={`flex items-center gap-3 px-3 py-2 ${index < 3 ? 'border-b border-line/70' : ''}`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
              <span className="flex-1 text-[11px] text-ink">{title}</span>
              <span className="text-[10px] text-muted">{status}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg bg-ink px-3 py-2.5 text-paper">
          <span className="text-[11px] font-medium">Next action</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-paper/80">
            Review submissions <ArrowRightIcon size={13} />
          </span>
        </div>
      </div>

      <div className="absolute -bottom-6 -left-6 rounded-lg border border-line bg-paper px-3 py-2 shadow-[0_18px_40px_-28px_rgba(17,17,17,0.4)]">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-yellow text-ink">
            <CheckIcon size={13} />
          </span>
          <div>
            <p className="text-[10px] font-semibold text-ink">Attendance saved</p>
            <p className="text-[9px] text-muted">One transaction</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const user = await getSessionUser();
  const dashboardHref = user ? roleHomePath(user.role) : null;

  return (
    <div className="min-h-screen bg-paper">
      <PublicHeader signedInRole={user?.role ?? null} />

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-line">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-[0.55] lg:block">
            <div className="dot-field-faint h-full w-full" />
          </div>
          <div className="relative mx-auto grid w-full max-w-7xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-24">
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <DotTag>Academic course management</DotTag>
                <span className="hidden h-4 w-px bg-line sm:block" />
                <span className="text-[11px] text-muted">Admin · Faculty · Student</span>
              </div>

              <h1 className="max-w-2xl text-balance font-display text-[2.6rem] font-semibold leading-[1.03] tracking-[-0.05em] sm:text-[3.4rem] lg:text-[4rem]">
                Run the semester
                <br />
                without the{' '}
                <span className="relative inline-block whitespace-nowrap">
                  spreadsheet
                  <span className="absolute inset-x-0 -bottom-1 h-[0.28em] bg-accent-yellow -z-10" />
                </span>{' '}
                sprawl.
              </h1>

              <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-[1.05rem]">
                AcadFlow connects academic setup, teaching, attendance and grading in one
                calm workspace. Every count, deadline and mark comes from your institution’s
                database — never a placeholder.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {dashboardHref ? (
                  <ButtonLink href={dashboardHref} size="lg">
                    Open your dashboard <ArrowRightIcon size={16} />
                  </ButtonLink>
                ) : (
                  <>
                    <ButtonLink href="/login" size="lg">
                      Sign in to AcadFlow <ArrowRightIcon size={16} />
                    </ButtonLink>
                    <ButtonLink href="/signup" size="lg" variant="secondary">
                      Create student account
                    </ButtonLink>
                  </>
                )}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CheckIcon size={14} className="text-success" /> Server-verified roles
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckIcon size={14} className="text-success" /> Audited grade changes
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckIcon size={14} className="text-success" /> Real-time PostgreSQL data
                </span>
              </div>
            </div>

            <HeroPreview />
          </div>
          <div className="accent-rule" aria-hidden />
        </section>

        {/* Roles */}
        <section id="roles" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="eyebrow mb-3">Three roles, one source of truth</p>
              <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-[2.5rem]">
                The right workspace for the work each person actually does.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              Navigation adapts to your role. Authorization does not: every protected read and
              write is checked on the server.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {ROLE_CARDS.map((card, index) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.role}
                  className="group relative overflow-hidden rounded-xl border border-line bg-paper p-6 transition-colors hover:border-ink"
                >
                  <div className={`absolute inset-x-0 top-0 h-1 ${card.accent}`} aria-hidden />
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface text-ink">
                      <Icon size={19} />
                    </span>
                    <span className="font-mono text-[10px] text-muted">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em]">{card.role}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{card.summary}</p>
                  <ul className="mt-5 flex flex-col gap-2.5 border-t border-line pt-4">
                    {card.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-[13px] text-ink">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-orange" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        {/* Workflows / features */}
        <section id="workflows" className="border-y border-line bg-surface">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="lg:sticky lg:top-24 lg:self-start">
                <p className="eyebrow mb-3">Built around the semester</p>
                <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-[2.5rem]">
                  From the first department record to the final published grade.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  Each workflow is connected. An enrollment creates a roster. A roster drives
                  attendance. Attendance and coursework feed the gradebook. Nothing is entered
                  twice, and nothing is invented.
                </p>
                <ol className="mt-8 flex flex-col gap-5">
                  {[
                    ['Set up the term', 'Departments, courses, academic terms, offerings and rosters.'],
                    ['Teach and track', 'Sessions, attendance, assignments and student submissions.'],
                    ['Review and publish', 'Marks, feedback, final grades and a permanent audit trail.'],
                  ].map(([title, body], index) => (
                    <li key={title} className="flex gap-4">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line bg-paper font-mono text-[11px] text-muted">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-muted">{body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <article
                      key={feature.title}
                      className="rounded-xl border border-line bg-paper p-5 transition-colors hover:border-ink"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface">
                        <Icon size={17} />
                      </span>
                      <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.015em]">
                        {feature.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">{feature.body}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Principles */}
        <section id="principles" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <p className="eyebrow mb-3">What you can rely on</p>
              <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-[2.5rem]">
                Quiet interface. Serious guarantees.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
                AcadFlow is an operational system, not a marketing dashboard. It stays honest
                about missing policy, unreleased marks and empty semesters.
              </p>
              <div className="mt-7">
                <ButtonLink href={dashboardHref ?? '/login'} variant="secondary">
                  {dashboardHref ? 'Go to your workspace' : 'Sign in to your workspace'}
                </ButtonLink>
              </div>
            </div>

            <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
              {[
                ['PostgreSQL is the source of truth', 'Counts, rosters and reports are queried, not hard-coded.'],
                ['Policy fails closed', 'Missing academic policy is shown clearly instead of guessed.'],
                ['Sessions are revocable', 'Roles and active status are re-read from the database.'],
                ['Every grade change is audited', 'Old value, new value, actor and reason are preserved.'],
                ['Files stay private', 'Downloads pass an ownership check before bytes are served.'],
                ['Built for the whole term', 'Setup, teaching, assessment and reporting live together.'],
              ].map(([title, body]) => (
                <div key={title} className="bg-paper p-5">
                  <dt className="flex items-start gap-2 text-sm font-semibold">
                    <CheckIcon size={15} className="mt-0.5 shrink-0 text-success" />
                    {title}
                  </dt>
                  <dd className="mt-1.5 pl-[23px] text-[13px] leading-relaxed text-muted">
                    {body}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-line bg-ink text-paper">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-20">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-paper/50">
                Ready when the term starts
              </p>
              <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-[2.5rem]">
                Bring the whole semester into one place.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-paper/65">
                Faculty and administrator accounts are provisioned by your institution.
                Students can create their own account to join an active roster.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={dashboardHref ?? '/login'}
                className="inline-flex h-12 items-center gap-2 rounded-md bg-accent-yellow px-6 text-sm font-semibold text-ink transition-colors hover:bg-[#ffd34f]"
              >
                {dashboardHref ? 'Open dashboard' : 'Sign in'} <ArrowRightIcon size={16} />
              </Link>
              {!user ? (
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center gap-2 rounded-md border border-paper/25 px-6 text-sm font-medium text-paper transition-colors hover:bg-paper/10"
                >
                  Create student account
                </Link>
              ) : null}
            </div>
          </div>
          <div className="accent-rule" aria-hidden />
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
