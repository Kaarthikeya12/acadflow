import 'server-only';
import { AppError } from '@/lib/db/errors';

const LOCAL_DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function getAppTimezone(): string {
  const timezone = process.env.APP_TIMEZONE?.trim();
  if (!timezone) {
    throw new AppError(
      'POLICY_NOT_CONFIGURED',
      'APP_TIMEZONE is not configured. Deadline operations are unavailable.',
    );
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
  } catch {
    throw new AppError(
      'POLICY_NOT_CONFIGURED',
      `APP_TIMEZONE "${timezone}" is not a valid IANA timezone.`,
    );
  }
  return timezone;
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = formatter.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value ?? '0';
    return Number.parseInt(value, 10);
  };
  let hour = get('hour');
  if (hour === 24) hour = 0;
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour,
    get('minute'),
    get('second'),
  );
  return asUtc - instant.getTime();
}

/**
 * Interprets a wall-clock `YYYY-MM-DDTHH:mm` value in the institution timezone
 * and returns the corresponding UTC instant. Never uses the browser timezone.
 */
export function zonedLocalToUtc(local: string): Date {
  const match = LOCAL_DATETIME_PATTERN.exec(local.trim());
  if (!match) {
    throw new AppError('VALIDATION_ERROR', 'Enter a date and time in YYYY-MM-DDTHH:mm format.', {
      fieldErrors: { dueAt: ['Enter a date and time in YYYY-MM-DDTHH:mm format.'] },
    });
  }
  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const second = Number(secondRaw ?? '0');

  if (
    month < 1 || month > 12 || day < 1 || day > 31 ||
    hour > 23 || minute > 59 || second > 59
  ) {
    throw new AppError('VALIDATION_ERROR', 'The date and time are not valid.');
  }

  const timeZone = getAppTimezone();
  const baseUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  // Two passes handle DST transitions without a timezone library.
  let instant = baseUtc - zoneOffsetMs(new Date(baseUtc), timeZone);
  instant = baseUtc - zoneOffsetMs(new Date(instant), timeZone);

  const result = new Date(instant);
  if (Number.isNaN(result.getTime())) {
    throw new AppError('VALIDATION_ERROR', 'The date and time are not valid.');
  }
  return result;
}

/** Formats a UTC instant as `YYYY-MM-DDTHH:mm` in the institution timezone. */
export function toLocalDateTimeInput(instant: Date | string): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  const timeZone = getAppTimezone();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '00';
  let hour = get('hour');
  if (hour === '24') hour = '00';
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

export function formatInstitutionDateTime(instant: Date | string): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: getAppTimezone(),
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

/** Wraps APP_TIMEZONE for SQL date/time conversion when a zone name is needed. */
export function appTimezoneOrNull(): string | null {
  try {
    return getAppTimezone();
  } catch {
    return null;
  }
}
