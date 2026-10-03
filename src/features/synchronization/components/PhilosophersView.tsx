import type { PhilosopherState, PhilosophersStepData } from '@/engine';
import { cn } from '@/utils';

export interface PhilosophersViewProps {
  readonly data: PhilosophersStepData;
}

const STATE_TONE: Record<PhilosopherState, string> = {
  thinking: 'is-neutral',
  hungry: 'is-warning',
  eating: 'is-positive',
  waiting: 'is-danger',
  done: 'is-neutral',
};

const STATE_LABEL: Record<PhilosopherState, string> = {
  thinking: 'Thinking',
  hungry: 'Hungry',
  eating: 'Eating',
  waiting: 'Waiting',
  done: 'Done',
};

/** Each philosopher's state and the forks they hold, plus fork ownership. */
export function PhilosophersView({ data }: PhilosophersViewProps) {
  return (
    <section className="phil-view" aria-label="Philosophers and forks">
      <ul className="phil-view__philosophers">
        {data.philosophers.map((philosopher) => (
          <li key={philosopher.name} className={cn('phil-card', STATE_TONE[philosopher.state])}>
            <span className="phil-card__name">{philosopher.name}</span>
            <span className="phil-card__state">{STATE_LABEL[philosopher.state]}</span>
            <span className="phil-card__forks">
              {philosopher.holds.length > 0 ? philosopher.holds.join(' + ') : 'no forks'}
            </span>
          </li>
        ))}
      </ul>

      <ul className="phil-view__forks">
        {data.forks.map((fork) => (
          <li key={fork.id} className={cn('fork-chip', fork.holder !== null && 'fork-chip--held')}>
            <span className="fork-chip__id">{fork.id}</span>
            <span className="fork-chip__holder">{fork.holder ?? 'free'}</span>
          </li>
        ))}
      </ul>

      <p className="phil-view__meta">
        {data.meals} meal{data.meals === 1 ? '' : 's'} eaten
        {data.deadlocked ? ' · deadlocked' : ''}
      </p>
    </section>
  );
}
