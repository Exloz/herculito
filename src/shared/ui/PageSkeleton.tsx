import type { AppPage } from '../../app/hooks/usePageNavigation';

interface PageSkeletonProps {
  page?: AppPage;
  compact?: boolean;
  className?: string;
}

export function PageSkeleton({ page = 'dashboard', compact = false, className = '' }: PageSkeletonProps) {
  return (
    <div className={`${compact ? '' : 'app-shell'} ${className}`} role="status" aria-label="Cargando vista" aria-busy="true">
      <span className="sr-only">Cargando…</span>
      <div className="page-container" aria-hidden="true">
        <div className="skeleton-block mb-3 h-3 w-24 rounded" />
        <div className="skeleton-block mb-3 h-8 w-56 max-w-full rounded" />
        <div className="skeleton-block mb-8 h-3 w-72 max-w-full rounded" />
        <div className="app-card mb-6 p-5"><div className="skeleton-block h-5 w-44 max-w-full rounded" />
          <div className="skeleton-block mt-4 h-12 w-full rounded" /></div>
        {page === 'dashboard' && <div className="overview-metrics">
          {[0, 1, 2, 3].map((key) => <div key={key} className="metric-card">
            <div className="skeleton-block h-3 w-20 rounded" /><div className="skeleton-block mt-4 h-8 w-12 rounded" />
          </div>)}
        </div>}
        <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map((key) => <div key={key} className="app-card p-5">
          <div className="skeleton-block h-4 w-28 rounded" />
          <div className="skeleton-block mt-4 h-32 w-full rounded" />
        </div>)}</div>
      </div>
    </div>
  );
}
