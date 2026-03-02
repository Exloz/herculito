import React from 'react';

type PageSkeletonVariant = 'dashboard' | 'routines';

interface PageSkeletonProps {
  page?: PageSkeletonVariant;
}

const SkeletonBlock = ({ className }: { className: string }) => {
  return <div className={`animate-pulse rounded-xl bg-slateDeep/80 ${className}`} aria-hidden="true" />;
};

const DashboardSkeleton = () => {
  return (
    <div className="app-shell pb-28">
      <header className="app-header px-4 pb-6 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <SkeletonBlock className="h-8 w-40 mb-2" />
              <SkeletonBlock className="h-4 w-52" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-10 w-24" />
              <SkeletonBlock className="h-10 w-20" />
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="app-surface p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-24" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <SkeletonBlock className="h-52" />
        <div className="grid lg:grid-cols-3 gap-6">
          <SkeletonBlock className="lg:col-span-2 h-[26rem]" />
          <SkeletonBlock className="h-[26rem]" />
        </div>
      </main>
    </div>
  );
};

const RoutinesSkeleton = () => {
  return (
    <div className="app-shell pb-28">
      <div className="max-w-4xl mx-auto px-4 pb-8 pt-[calc(2rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <SkeletonBlock className="h-8 w-36 mb-2" />
            <SkeletonBlock className="h-4 w-52" />
          </div>
          <SkeletonBlock className="h-11 w-11" />
        </div>

        <div className="app-surface p-1 mb-6 flex gap-1">
          <SkeletonBlock className="h-10 flex-1" />
          <SkeletonBlock className="h-10 flex-1" />
        </div>

        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-40" />
          ))}
        </div>
      </div>
    </div>
  );
};

export const PageSkeleton: React.FC<PageSkeletonProps> = ({ page = 'dashboard' }) => {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Cargando contenido</span>
      {page === 'routines' ? <RoutinesSkeleton /> : <DashboardSkeleton />}
    </div>
  );
};
