import React from 'react';

type PageSkeletonVariant = 'dashboard' | 'routines' | 'admin' | 'sports';

interface PageSkeletonProps {
  page?: PageSkeletonVariant;
  compact?: boolean;
  className?: string;
}

const SkeletonBlock = ({ className }: { className: string }) => {
  return <div className={`skeleton-block rounded-xl ${className}`} aria-hidden="true" />;
};

const DashboardSkeleton = ({ compact = false }: { compact?: boolean }) => {
  return (
    <div className={compact ? 'h-full pb-6' : 'app-shell pb-28'}>
      <header className="app-header px-4 pb-4 pt-[calc(0.25rem+env(safe-area-inset-top))] sm:pb-5 sm:pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-10 w-10 shrink-0 rounded-2xl sm:h-11 sm:w-11" />
                <div className="min-w-0 flex-1">
                  <SkeletonBlock className="h-3 w-40 max-w-[70%] rounded-lg" />
                  <SkeletonBlock className="mt-2 h-10 w-44 max-w-[85%] rounded-lg sm:h-11" />
                </div>
              </div>
            </div>
            <SkeletonBlock className="h-11 w-11 shrink-0 rounded-[1rem]" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <section className="mb-5 overflow-hidden rounded-[1.5rem] bg-[radial-gradient(circle_at_top_right,rgba(72,229,163,0.08),transparent_28%),linear-gradient(180deg,rgba(18,24,35,0.96),rgba(11,15,20,0.96))] px-4 py-4 shadow-lift sm:px-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SkeletonBlock className="h-3 w-14 rounded-lg" />
                <SkeletonBlock className="h-7 w-32 rounded-full" />
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
                <SkeletonBlock className="h-12 w-56 max-w-full rounded-lg sm:h-14" />
                <SkeletonBlock className="h-6 w-24 rounded-full" />
              </div>

              <SkeletonBlock className="mt-2 h-5 w-72 max-w-full rounded-lg" />

              <div className="mt-3 grid grid-cols-6 gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <SkeletonBlock key={`top-stat-${index}`} className="col-span-2 h-[4.5rem] rounded-[1rem]" />
                ))}
                {Array.from({ length: 2 }).map((_, index) => (
                  <SkeletonBlock key={`bottom-stat-${index}`} className="col-span-3 h-[4.5rem] rounded-[1rem]" />
                ))}
              </div>
            </div>

            <div className="rounded-[1.1rem] bg-slateDeep/55 px-3 py-3">
              <SkeletonBlock className="mb-2 h-4 w-24 rounded-lg" />
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="rounded-[0.95rem] bg-black/10 px-3 py-2.5">
                    <SkeletonBlock className="h-3 w-16 rounded-lg" />
                    <SkeletonBlock className="mt-2 h-6 w-28 rounded-lg" />
                    <SkeletonBlock className="mt-2 h-4 w-24 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(21,30,43,0.72),rgba(14,20,31,0.76))] p-1 shadow-lift">
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-12 rounded-[1rem]" />
            ))}
          </div>
        </section>

        <section className="mt-2 space-y-4">
          <div className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <SkeletonBlock className="h-3 w-20 rounded-lg" />
              <SkeletonBlock className="mt-2 h-9 w-56 max-w-full rounded-lg" />
            </div>
            <SkeletonBlock className="h-4 w-64 max-w-full rounded-lg" />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-20 rounded-[1.1rem]" />
            ))}
          </div>

          <SkeletonBlock className="h-[20rem] rounded-[1.6rem]" />
        </section>
      </main>
    </div>
  );
};

const RoutinesSkeleton = ({ compact = false }: { compact?: boolean }) => {
  return (
    <div className={compact ? 'h-full pb-6' : 'app-shell pb-28'}>
      <div className="max-w-4xl mx-auto px-4 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))] sm:pb-8 sm:pt-[calc(2rem+env(safe-area-inset-top))]">
        <section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <SkeletonBlock className="h-3 w-40 rounded-lg" />
            <SkeletonBlock className="mt-2 h-10 w-40 rounded-lg" />
            <SkeletonBlock className="mt-2 h-4 w-72 max-w-full rounded-lg" />
          </div>
          <SkeletonBlock className="h-11 w-36 rounded-xl" />
        </section>

        <div className="mb-4 flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-6 w-24 rounded-full" />
          ))}
        </div>

        <div className="mb-5 rounded-[1.2rem] bg-graphite/80 p-1.5 shadow-soft">
          <SkeletonBlock className="mx-2 mb-2 h-3 w-12 rounded-lg" />
          <div className="grid grid-cols-2 gap-1">
            <SkeletonBlock className="h-24 rounded-[0.95rem]" />
            <SkeletonBlock className="h-24 rounded-[0.95rem]" />
          </div>
        </div>

        <SkeletonBlock className="mb-4 h-12 rounded-[1rem]" />

        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-40 rounded-[1.4rem]" />
          ))}
        </div>
      </div>
    </div>
  );
};

const AdminSkeleton = ({ compact = false }: { compact?: boolean }) => {
  return (
    <div className={compact ? 'h-full pb-6' : 'app-shell pb-28'}>
      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:py-8">
        <section className="rounded-[1.45rem] border border-amberGlow/25 bg-[radial-gradient(circle_at_95%_-15%,oklch(0.78_0.16_72/0.22),transparent_52%),radial-gradient(circle_at_0%_0%,oklch(0.73_0.16_38/0.2),transparent_42%),linear-gradient(180deg,rgba(17,24,39,0.99),rgba(11,15,20,0.99))] px-4 py-4 shadow-lift sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <SkeletonBlock className="h-3 w-36 rounded-lg" />
              <SkeletonBlock className="mt-2 h-12 w-32 rounded-lg" />
              <SkeletonBlock className="mt-2 h-4 w-80 max-w-full rounded-lg" />
            </div>
            <SkeletonBlock className="h-11 w-full rounded-xl sm:w-44" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-24 rounded-[1rem]" />
            ))}
          </div>
        </section>

        <SkeletonBlock className="h-36 rounded-[1.2rem]" />

        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-48 rounded-[1.2rem]" />
          ))}
        </div>
      </main>
    </div>
  );
};

const SportsSkeleton = ({ compact = false }: { compact?: boolean }) => {
  return (
    <div className={compact ? 'h-full pb-6' : 'app-shell pb-28'}>
      <div className="max-w-4xl mx-auto px-4 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))] sm:pb-8 sm:pt-[calc(2rem+env(safe-area-inset-top))]">
        <section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <SkeletonBlock className="h-3 w-40 rounded-lg" />
            <SkeletonBlock className="mt-2 h-10 w-32 rounded-lg" />
            <SkeletonBlock className="mt-2 h-4 w-72 max-w-full rounded-lg" />
          </div>
          <SkeletonBlock className="h-11 w-36 rounded-xl" />
        </section>

        <SkeletonBlock className="mb-3 h-3 w-32 rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-32 rounded-2xl" />
          ))}
        </div>

        <SkeletonBlock className="mb-4 h-36 rounded-2xl" />

        <div className="flex gap-2 mb-4">
          <SkeletonBlock className="h-10 w-32 rounded-xl" />
          <SkeletonBlock className="h-10 w-32 rounded-xl" />
        </div>

        <SkeletonBlock className="h-64 rounded-2xl" />
      </div>
    </div>
  );
};

export const PageSkeleton: React.FC<PageSkeletonProps> = ({ page = 'dashboard', compact = false, className = '' }) => {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">Cargando contenido</span>
      {page === 'routines' && <RoutinesSkeleton compact={compact} />}
      {page === 'admin' && <AdminSkeleton compact={compact} />}
      {page === 'dashboard' && <DashboardSkeleton compact={compact} />}
      {page === 'sports' && <SportsSkeleton compact={compact} />}
    </div>
  );
};
