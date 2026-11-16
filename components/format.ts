const TIME_ZONE = process.env.APP_TIMEZONE?.trim() || 'Asia/Kolkata';

function parse(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parse(value));
}

export function formatShortDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: 'short',
  }).format(parse(value));
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(parse(value));
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(parse(value));
}

export function formatWeekday(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    weekday: 'long',
  }).format(parse(value));
}

export function formatDayMonth(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = parse(value);
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, day: '2-digit' }).format(
    date,
  );
  const month = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, month: 'short' }).format(
    date,
  );
  return `${day} ${month}`;
}

/** `YYYY-MM-DDTHH:mm` in the institution timezone, for datetime-local inputs. */
export function toDateTimeLocal(value: string | Date | null | undefined): string {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(parse(value));
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '00';
  let hour = get('hour');
  if (hour === '24') hour = '00';
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

export function formatDecimal(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toLocaleString('en-GB', { maximumFractionDigits: 2 });
}

export function formatPercent(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return `${formatDecimal(value)}%`;
}

/** "in 3 days", "tomorrow", "2 days ago" — computed against the current instant. */
export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const target = parse(value).getTime();
  const diffMs = target - Date.now();
  const abs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs < minute) return diffMs >= 0 ? 'now' : 'just now';
  const format = (amount: number, unit: string) => {
    const rounded = Math.round(amount);
    const plural = rounded === 1 ? unit : `${unit}s`;
    return diffMs >= 0 ? `in ${rounded} ${plural}` : `${rounded} ${plural} ago`;
  };
  if (abs < hour) return format(abs / minute, 'min');
  if (abs < day) return format(abs / hour, 'hour');
  if (abs < 14 * day) return format(abs / day, 'day');
  return formatDate(value);
}

export function isPast(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  return parse(value).getTime() < Date.now();
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function titleCase(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}
