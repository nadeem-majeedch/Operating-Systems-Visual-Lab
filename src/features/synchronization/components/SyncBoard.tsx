import type { SyncActorView, SyncStepData, SyncTone } from '@/engine';
import { cn } from '@/utils';

export interface SyncBoardProps {
  readonly data: SyncStepData;
  readonly title: string;
  readonly className?: string;
}

const SYNC_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#34d399', '#f472b6', '#a78bfa'];

function actorColor(index: number): string {
  if (SYNC_COLORS.length === 0) return '#818cf8';
  return SYNC_COLORS[index % SYNC_COLORS.length] ?? '#818cf8';
}

function toneClass(tone: SyncTone | undefined): string {
  if (tone === 'positive') return 'is-positive';
  if (tone === 'warning') return 'is-warning';
  if (tone === 'danger') return 'is-danger';
  return '';
}

function ActorCard({ actor, index }: { readonly actor: SyncActorView; readonly index: number }) {
  return (
    <li className={cn('sync-actor', toneClass(actor.tone))}>
      <span className="sync-actor__swatch" style={{ backgroundColor: actorColor(index) }} aria-hidden="true" />
      <span className="sync-actor__name">{actor.name}</span>
      <span className={cn('sync-actor__state', toneClass(actor.tone))}>{actor.status}</span>
      {actor.detail ? <span className="sync-actor__detail">{actor.detail}</span> : null}
    </li>
  );
}

/**
 * The common stage for every synchronization simulation.
 *
 * It shows the actors and their states, the shared resources, and the two flags
 * that matter most — whether the run is still correct and whether it has
 * deadlocked. Kind-specific visualisations render around it.
 */
export function SyncBoard({ data, title, className }: SyncBoardProps) {
  return (
    <section className={cn('sync-board', className)} aria-label={title}>
      <header className="sync-board__header">
        <h4 className="sync-board__title">{title}</h4>
        <div className="sync-board__flags">
          <span className={cn('sync-flag', data.correct ? 'is-positive' : 'is-danger')}>
            {data.correct ? 'Correct so far' : 'Incorrect result'}
          </span>
          {data.deadlocked ? <span className="sync-flag is-danger">Deadlocked</span> : null}
        </div>
      </header>

      <div className="sync-board__resources">
        {data.resources.map((resource) => (
          <div className={cn('sync-resource', toneClass(resource.tone))} key={resource.name}>
            <span className="sync-resource__name">{resource.name}</span>
            <span className="sync-resource__value">{resource.value}</span>
            {resource.hint ? <span className="sync-resource__hint">{resource.hint}</span> : null}
          </div>
        ))}
      </div>

      <ul className="sync-board__actors">
        {data.actors.map((actor, index) => (
          <ActorCard actor={actor} index={index} key={actor.name} />
        ))}
      </ul>
    </section>
  );
}
