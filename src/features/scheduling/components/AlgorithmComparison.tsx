import { useMemo } from 'react';
import type { Algorithm } from '@/types';
import type { Process, ScheduleStepData, SimulationRun } from '@/engine';
import { cn, formatNumber, formatPercent } from '@/utils';
import { SCHEDULING_ALGORITHM_IDS, runSchedulingAlgorithm } from '../algorithmRunners';
import { MiniGantt } from './MiniGantt';

export interface AlgorithmComparisonProps {
  readonly processes: readonly Process[];
  readonly quantum: number;
  readonly colorFor: (processId: string | null) => string;
  /** Catalogue entries used for display names, keyed by algorithm id. */
  readonly algorithms: readonly Algorithm[];
  readonly className?: string;
}

interface ComparisonRow {
  readonly id: string;
  readonly name: string;
  readonly run: SimulationRun<ScheduleStepData> | null;
}

function summaryNumber(run: SimulationRun<ScheduleStepData>, key: string): number {
  return run.summary[key] ?? 0;
}

/**
 * What each policy is good at.
 *
 * These are deliberately prose, not scores: an algorithm's fitness depends on
 * the workload and on what the system is optimising for, so ranking them on one
 * number would be misleading.
 */
const SUITABILITY: Readonly<Record<string, string>> = {
  fcfs: 'Simple and starvation-free, but a long job at the front delays everything behind it (the convoy effect).',
  sjf: 'Best average waiting time for a known batch, but it needs burst-time estimates and can starve long jobs.',
  srtf: 'Strong average waiting and response times for varied arrivals, at the cost of frequent context switches.',
  'round-robin': 'Fair, bounded response for interactive systems; small quanta add overhead, large ones drift toward FCFS.',
  'priority-scheduling': 'Honours urgency without extra switches, but low-priority work can starve without aging.',
  'priority-preemptive': 'Best response for urgent work, at the cost of the most context switches and the strongest starvation risk.',
};

const METRICS: readonly {
  readonly key: string;
  readonly label: string;
  readonly format: (value: number) => string;
}[] = [
  { key: 'averageWaitingTime', label: 'Avg waiting', format: (value) => formatNumber(value, 2) },
  { key: 'averageTurnaroundTime', label: 'Avg turnaround', format: (value) => formatNumber(value, 2) },
  { key: 'averageResponseTime', label: 'Avg response', format: (value) => formatNumber(value, 2) },
  { key: 'cpuUtilization', label: 'CPU utilisation', format: (value) => formatPercent(value, 0) },
  { key: 'throughput', label: 'Throughput', format: (value) => formatNumber(value, 3) },
  { key: 'contextSwitches', label: 'Context switches', format: (value) => String(value) },
];

/**
 * Run every scheduling policy on the current workload and lay the results out
 * side by side.
 *
 * Nothing here is precomputed and nothing is scored: each cell is read from the
 * same engine that drives the single-algorithm workstation, and the page
 * explains what each policy is suited to rather than declaring a winner.
 */
export function AlgorithmComparison({
  processes,
  quantum,
  colorFor,
  algorithms,
  className,
}: AlgorithmComparisonProps) {
  const rows = useMemo<ComparisonRow[]>(
    () =>
      SCHEDULING_ALGORITHM_IDS.map((id) => ({
        id,
        name: algorithms.find((algorithm) => algorithm.id === id)?.name ?? id,
        run: runSchedulingAlgorithm(id, { processes, quantum }),
      })),
    [algorithms, processes, quantum],
  );

  const span = useMemo(() => {
    const makespans = rows
      .filter((row) => row.run !== null)
      .map((row) => summaryNumber(row.run!, 'makespan'));
    const fallback = processes.reduce(
      (total, process) => total + process.arrivalTime + process.burstTime,
      0,
    );
    return Math.max(1, ...makespans, fallback);
  }, [processes, rows]);

  return (
    <section className={cn('algorithm-comparison', className)} aria-label="Algorithm comparison">
      <header className="algorithm-comparison__header">
        <h4 className="panel__title">Same workload, every policy</h4>
        <p className="algorithm-comparison__lead">
          All six schedulers run over the workload above, and every figure below comes straight from
          the engine. There is no single winner: which scheduler is “best” depends on this workload
          and on what you are optimising for — average waiting time, worst-case response, fairness,
          or context-switch overhead. Read the notes under the table before drawing conclusions.
        </p>
      </header>

      <div className="table-wrap">
        <table className="data-table data-table--comparison">
          <caption className="sr-only">
            Metric comparison of the six CPU scheduling policies over one workload, without ranking.
          </caption>
          <thead>
            <tr>
              <th scope="col">Algorithm</th>
              {METRICS.map((metric) => (
                <th scope="col" key={metric.key}>
                  {metric.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.name}</th>
                {row.run === null ? (
                  <td colSpan={METRICS.length} className="data-table__pending">
                    workload not valid for this policy
                  </td>
                ) : (
                  METRICS.map((metric) => (
                    <td key={metric.key}>{metric.format(summaryNumber(row.run!, metric.key))}</td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="algorithm-comparison__charts">
        {rows.map((row) => (
          <div className="compare-row" key={row.id}>
            <span className="compare-row__label">{row.name}</span>
            {row.run === null ? (
              <span className="compare-row__empty">not runnable</span>
            ) : (
              <MiniGantt
                timeline={row.run.steps[row.run.steps.length - 1]?.data.timeline ?? []}
                span={span}
                colorFor={colorFor}
                ariaLabel={`${row.name} schedule, ${row.run.steps.length} steps`}
              />
            )}
          </div>
        ))}
      </div>

      <ul className="algorithm-comparison__notes">
        {rows.map((row) => (
          <li key={row.id} className="comparison-note">
            <span className="comparison-note__name">{row.name}</span>
            <span className="comparison-note__text">
              {SUITABILITY[row.id] ?? 'Suited to a specific workload mix.'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
