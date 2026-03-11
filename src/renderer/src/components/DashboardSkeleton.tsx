import * as React from 'react';
import { Skeleton } from './ui/skeleton';

export const DashboardSkeleton = (): React.JSX.Element => {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      {/* Status Row */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24 rounded-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>

      {/* AI Tools */}
      <section>
        <Skeleton className="mb-2 h-3.5 w-16" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      </section>

      {/* Stats + Radial */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-[hsl(var(--panel))] p-5 shadow-sm">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-20" />
              <Skeleton className="mt-2 h-3 w-32" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center rounded-lg border bg-[hsl(var(--panel))] p-5 shadow-sm">
          <Skeleton className="h-[150px] w-[150px] rounded-full" />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-[hsl(var(--panel))] p-5 shadow-sm">
          <Skeleton className="mb-3 h-3 w-24" />
          <Skeleton className="h-[220px] rounded-md" />
        </div>
        <div className="rounded-lg border bg-[hsl(var(--panel))] p-5 shadow-sm">
          <Skeleton className="mb-3 h-3 w-28" />
          <Skeleton className="h-[220px] rounded-md" />
        </div>
      </div>

      {/* Top Apps Table */}
      <section>
        <Skeleton className="mb-2 h-3.5 w-28" />
        <div className="rounded-lg border bg-[hsl(var(--panel))] shadow-sm p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2.5">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 flex-1 max-w-[180px]" />
              <Skeleton className="ml-auto h-4 w-16" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
