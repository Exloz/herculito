import { useId, useState } from 'react';
import { Activity, ArrowDown, ArrowUp, CalendarDays, Dumbbell, Target, Timer } from 'lucide-react';
import type { DashboardRecentSession } from '../../../shared/types';
import { APP_TIME_ZONE } from '../../../shared/lib/dateUtils';
import { formatCountLabel, formatDateValue, formatNumber } from '../../../shared/lib/intl';
import { MuscleGroupIcon } from './MuscleGroupIcon';

interface RecentActivityProps {
  sessions: DashboardRecentSession[];
  onExploreRoutines: () => void;
}

export function RecentActivity({ sessions, onExploreRoutines }: RecentActivityProps) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const headingId = useId();
  const months = new Set(sessions.map(({ completedAt }) => formatDateValue(completedAt,
    { month: 'long', year: 'numeric', timeZone: APP_TIME_ZONE })));
  const years = new Set(sessions.map(({ completedAt }) => formatDateValue(completedAt,
    { year: 'numeric', timeZone: APP_TIME_ZONE })));
  const visibleSessions = expanded ? sessions : sessions.slice(0, 3);

  return (
    <section className="recent-activity" aria-labelledby={headingId}>
      <div className="agenda-section-heading">
        <h2 id={headingId}>Actividad reciente</h2>
        {sessions.length > 0 && <span>{months.size === 1 ? [...months][0]
          : formatCountLabel(sessions.length, 'sesión', 'sesiones')}</span>}
      </div>
      {sessions.length ? <>
        <ol id={listId} className="activity-timeline">
          {visibleSessions.map((session) => (
            <li key={session.id} className="timeline-entry" data-muscle-group={session.primaryMuscleGroup}
              data-sport={session.sportType}>
              <div className="min-w-0 flex-1">
                <time dateTime={session.completedAt.toISOString()}
                  aria-label={formatDateValue(session.completedAt, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: APP_TIME_ZONE })}>
                  {formatDateValue(session.completedAt, { weekday: 'long', day: 'numeric', month: 'long',
                    ...(years.size > 1 ? { year: 'numeric' as const } : {}), timeZone: APP_TIME_ZONE })}
                </time>
                <h3>
                  <span className="timeline-session-icon" aria-hidden="true">
                    {session.activityKind === 'sport'
                      ? session.sportType === 'archery' ? <Target size={13} /> : session.sportType === 'hiit' ? <Timer size={13} /> : <Activity size={13} />
                      : session.primaryMuscleGroup ? <MuscleGroupIcon muscleGroup={session.primaryMuscleGroup} size={13} /> : <Dumbbell size={13} />}
                  </span>
                  <span className="min-w-0">{session.routineName}</span>
                </h3>
              </div>
              {session.totalDuration != null && <span className="timeline-duration">{formatNumber(session.totalDuration)} min</span>}
            </li>
          ))}
        </ol>
        {sessions.length > 3 && <button type="button" className="timeline-more" aria-expanded={expanded}
          aria-controls={listId} onClick={() => setExpanded((open) => !open)}>
          {expanded ? 'Mostrar menos' : `Ver las ${formatCountLabel(sessions.length, 'sesión', 'sesiones')}`}
          {expanded ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />}
        </button>}
      </> : <div className="agenda-empty">
        <CalendarDays size={21} aria-hidden="true" />
        <div><h3>Aún no hay actividad</h3><p>Tu próxima sesión es el comienzo de tu historial.</p>
          <button type="button" className="timeline-more" onClick={onExploreRoutines}>Explorar rutinas</button></div>
      </div>}
    </section>
  );
}
