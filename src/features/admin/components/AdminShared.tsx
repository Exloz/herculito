import React from 'react';
import { ChevronDown } from 'lucide-react';

export const Sparkline = ({
  points,
  strokeClassName = 'stroke-mint',
  fillClassName = 'fill-mint/10'
}: {
  points: Array<{ timestamp: number; topWeight: number }>;
  strokeClassName?: string;
  fillClassName?: string;
}) => {
  const safePoints = points.length > 0 ? points : [{ timestamp: Date.now(), topWeight: 0 }];
  const width = 220;
  const height = 72;
  const padding = 8;
  const values = safePoints.map((point) => point.topWeight);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const step = safePoints.length > 1 ? (width - padding * 2) / (safePoints.length - 1) : 0;

  const coordinates = safePoints.map((point, index) => {
    const x = padding + index * step;
    const normalized = (point.topWeight - min) / range;
    const y = height - padding - normalized * (height - padding * 2);
    return { x, y };
  });

  const linePath = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${coordinates[coordinates.length - 1].x} ${height - padding} L ${coordinates[0].x} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full overflow-visible">
      <path d={areaPath} className={fillClassName} />
      <path d={linePath} className={`fill-none stroke-[2.5] ${strokeClassName}`} strokeLinecap="round" strokeLinejoin="round" />
      {coordinates.map((point, index) => (
        <circle
          key={`${safePoints[index].timestamp}-${safePoints[index].topWeight}`}
          cx={point.x}
          cy={point.y}
          r="3"
          className={`stroke-[1.5] ${strokeClassName} fill-ink`}
        />
      ))}
    </svg>
  );
};

export const SectionAccordion = ({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children
}: {
  title: string;
  subtitle: string;
  badge: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  return (
    <details open={defaultOpen} className="motion-enter group overflow-hidden rounded-[1.3rem] border border-[oklch(0.72_0.1_62/0.22)] bg-[radial-gradient(circle_at_100%_0%,oklch(0.77_0.12_70/0.12),transparent_48%),linear-gradient(180deg,rgba(22,28,38,0.98),rgba(11,15,20,0.98))] shadow-lift">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amberGlow/80">Sección</div>
          <h2 className="mt-1 text-lg font-display text-white sm:text-xl">{title}</h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-300 sm:text-sm">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {badge}
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-amberGlow/25 bg-amberGlow/10 text-amberGlow transition group-open:rotate-180 sm:h-10 sm:w-10">
            <ChevronDown size={18} />
          </div>
        </div>
      </summary>

      <div className="border-t border-amberGlow/15 px-4 py-3.5 sm:px-5 sm:py-4">{children}</div>
    </details>
  );
};
