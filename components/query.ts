export type SearchParams = Record<string, string | string[] | undefined>;

export function one(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : undefined;
}

export function pageParam(params: SearchParams): number {
  const raw = Number.parseInt(one(params.page) ?? '1', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

export function pageSizeParam(params: SearchParams, fallback = 20): number {
  const raw = Number.parseInt(one(params.pageSize) ?? String(fallback), 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(Math.max(raw, 1), 100);
}

/** A stable subset of the current search params for pagination links. */
export function paginationParams(
  params: SearchParams,
  keys: string[],
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const key of keys) result[key] = one(params[key]);
  return result;
}
