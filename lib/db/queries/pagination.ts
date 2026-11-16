import 'server-only';
import type { PageQuery } from '@/types/contracts';
import { AppError } from '@/lib/db/errors';

export type PageWindow = { page: number; pageSize: number; limit: number; offset: number };

export function pageWindow(input: PageQuery): PageWindow {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 20;
  if (!Number.isInteger(page) || page < 1) {
    throw new AppError('VALIDATION_ERROR', 'Page must be a positive integer.', {
      fieldErrors: { page: ['Page must be a positive integer.'] },
    });
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new AppError('VALIDATION_ERROR', 'Page size must be between 1 and 100.', {
      fieldErrors: { pageSize: ['Page size must be between 1 and 100.'] },
    });
  }
  return { page, pageSize, limit: pageSize, offset: (page - 1) * pageSize };
}

/** Trims, caps and escapes `%`, `_` and `\` before use in ILIKE. */
export function likePattern(search: string | undefined): string | null {
  if (!search) return null;
  const trimmed = search.trim().slice(0, 100);
  if (!trimmed) return null;
  const escaped = trimmed.replace(/[\\%_]/g, (character) => `\\${character}`);
  return `%${escaped}%`;
}

export function orderClause(
  requested: string | undefined,
  order: 'asc' | 'desc' | undefined,
  allowlist: Record<string, string>,
  fallback: string,
): string {
  const column = requested && allowlist[requested] ? allowlist[requested] : fallback;
  const direction = order === 'asc' ? 'ASC' : 'DESC';
  // Column and direction come from server-side constants only.
  return `${column} ${direction}`;
}

export function totalPages(total: number, pageSize: number): number {
  return total === 0 ? 0 : Math.ceil(total / pageSize);
}
