import type { RaceStepData } from '@/engine';
import { cn } from '@/utils';

export interface RaceViewProps {
  readonly data: RaceStepData;
}

/** The shared counter, the critical section, and each process's register. */
export function RaceView({ data }: RaceViewProps) {
  return (
    <section className="race-view" aria-label="Shared counter">
      <div className="race-view__counter">
        <span className="race-view__counter-value">{data.counter}</span>
        <span className="race-view__counter-label">
          shared counter · expected {data.expected}
        </span>
      </div>

      <div className="race-view__status">
        <span
          className={cn(
            'race-view__cs',
            data.mode === 'unsafe' ? 'is-danger' : 'is-positive',
          )}
        >
          {data.mode === 'unsafe'
            ? 'no critical section'
            : data.criticalSectionOwner !== null
              ? `${data.criticalSectionOwner} holds the lock`
              : 'critical section free'}
        </span>
        <span className={cn('race-view__lost', data.lostUpdates > 0 && 'is-danger')}>
          lost updates: {data.lostUpdates}
        </span>
      </div>

      <table className="data-table data-table--compact">
        <caption className="sr-only">Register values and current instruction per process.</caption>
        <thead>
          <tr>
            <th scope="col">Process</th>
            <th scope="col">Register</th>
            <th scope="col">Instruction</th>
          </tr>
        </thead>
        <tbody>
          {data.actors.map((actor) => (
            <tr key={actor.name} className={actor.state === 'running' ? 'data-table__row--active' : undefined}>
              <th scope="row">{actor.name}</th>
              <td>{data.registers.find((register) => register.name === actor.name)?.value ?? '—'}</td>
              <td>{actor.detail ?? actor.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
