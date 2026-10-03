import type { ProcessResult } from '@/engine';

/** Minimal identity of a process row, stable while the schedule is built. */
export interface ProcessRow {
  readonly id: string;
  readonly name: string;
}

export interface ProcessTableProps {
  readonly results: readonly ProcessResult[];
  readonly colorFor: (processId: string | null) => string;
  /** Process that just ran — emphasised in the table. */
  readonly highlight?: string | null;
  /** Rows to render, in arrival order, even before a result exists. */
  readonly rows: readonly ProcessRow[];
}

/**
 * Results table. Turnaround and waiting time are computed live so learners can
 * check the arithmetic against the Gantt chart above.
 */
export function ProcessTable({ results, colorFor, highlight = null, rows }: ProcessTableProps) {
  const byId = new Map(results.map((result) => [result.processId, result]));

  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption className="sr-only">
          Scheduling results per process: arrival, burst, start, completion, turnaround and waiting
          time.
        </caption>
        <thead>
          <tr>
            <th scope="col">Process</th>
            <th scope="col">Arrival</th>
            <th scope="col">Burst</th>
            <th scope="col">Start</th>
            <th scope="col">Completion</th>
            <th scope="col">Turnaround</th>
            <th scope="col">Waiting</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((process) => {
            const result = byId.get(process.id);
            return (
              <tr
                key={process.id}
                className={highlight === process.id ? 'data-table__row--active' : undefined}
              >
                <th scope="row">
                  <span
                    className="data-table__swatch"
                    aria-hidden="true"
                    style={{ backgroundColor: colorFor(process.id) }}
                  />
                  {process.name}
                </th>
                {result ? (
                  <>
                    <td>{result.arrivalTime}</td>
                    <td>{result.burstTime}</td>
                    <td>{result.startTime}</td>
                    <td>{result.completionTime}</td>
                    <td>{result.turnaroundTime}</td>
                    <td>{result.waitingTime}</td>
                  </>
                ) : (
                  <td colSpan={6} className="data-table__pending">
                    waiting for the CPU
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {results.length === 0 ? (
        <p className="data-table__empty">No process has completed yet.</p>
      ) : null}
    </div>
  );
}
