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
    <details open={defaultOpen} className="group overflow-hidden rounded-[1.8rem] border border-mist/60 bg-[linear-gradient(180deg,rgba(22,28,38,0.98),rgba(11,15,20,0.98))] shadow-lift">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Sección</div>
          <h2 className="mt-1 text-xl font-display text-white">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {badge}
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition group-open:rotate-180">
            <ChevronDown size={18} />
          </div>
        </div>
      </summary>

      <div className="border-t border-white/8 px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </details>
  );
};
