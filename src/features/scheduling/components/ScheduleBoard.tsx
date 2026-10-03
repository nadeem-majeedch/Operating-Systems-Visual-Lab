import type { GanttSegment } from '@/engine';
import { cn } from '@/utils';
import { GanttChart } from './GanttChart';

export interface ScheduleBoardProps {
  readonly title: string;
  readonly timeline: readonly GanttSegment[];
  readonly span: number;
  readonly colorFor: (processId: string | null) => string;
  readonly runningProcessId: string | null;
  readonly readyQueue: readonly string[];
  /** Extra readout shown beside the queue, e.g. the current quantum. */
  readonly note?: string;
  readonly className?: string;
}

/** The stage area of a scheduling lab: Gantt chart plus current CPU state. */
export function ScheduleBoard({
  title,
  timeline,
  span,
  colorFor,
  runningProcessId,
  readyQueue,
  note,
  className,
}: ScheduleBoardProps) {
  const running =
    runningProcessId === null
      ? 'idle'
      : timeline.find((segment) => segment.processId === runningProcessId)?.label ??
        runningProcessId;

  return (
    <section className={cn('schedule-board', className)} aria-label={title}>
      <header className="schedule-board__header">
        <h4 className="schedule-board__title">{title}</h4>
        {note ? <span className="schedule-board__note">{note}</span> : null}
      </header>

      <GanttChart
        timeline={timeline}
        span={span}
        colorFor={colorFor}
        highlight={runningProcessId}
        ariaLabel={`Gantt chart with ${timeline.length} scheduling blocks`}
      />

      <dl className="schedule-board__state">
        <div>
          <dt>On the CPU</dt>
          <dd className={runningProcessId === null ? 'is-idle' : undefined}>{running}</dd>
        </div>
        <div>
          <dt>Ready queue</dt>
          <dd>
            {readyQueue.length === 0 ? (
              <span className="is-idle">empty</span>
            ) : (
              <ol className="schedule-board__queue">
                {readyQueue.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ol>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
