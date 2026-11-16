import { Card, Skeleton } from '@/components/ui';

/**
 * Shared route-level loading state. Keeps the shell stable while server
 * components fetch data, and mirrors the common page header + cards rhythm.
 */
export function PageLoading({
  title = 'Loading',
  rows = 4,
}: {
  title?: string;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label={title}>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-3 w-full max-w-xl" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-line bg-paper p-5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-4 h-7 w-16" />
          </div>
        ))}
      </div>

      <Card>
        <div className="border-b border-line px-5 py-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-64 max-w-full" />
        </div>
        <div className="flex flex-col divide-y divide-line">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
              <Skeleton className="hidden h-6 w-20 sm:block" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
