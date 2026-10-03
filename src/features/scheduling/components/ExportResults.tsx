import { useCallback } from 'react';
import type { Process, ScheduleStepData, SimulationRun } from '@/engine';
import { scheduleRunToJson } from '@/engine';
import { Button } from '@/components';

export interface ExportResultsProps {
  /** The run to export; `null` disables the button. */
  readonly run: SimulationRun<ScheduleStepData> | null;
  readonly processes: readonly Process[];
  readonly quantum?: number;
  readonly algorithmName?: string;
  readonly disabled?: boolean;
}

/**
 * Downloads the current run as JSON.
 *
 * The payload is produced by the pure `scheduleRunToJson` serializer, so what
 * lands on disk is exactly what the engine produced — workload, summary,
 * per-process results, timeline and every step's explanation.
 */
export function ExportResults({
  run,
  processes,
  quantum,
  algorithmName,
  disabled = false,
}: ExportResultsProps) {
  const handleExport = useCallback(() => {
    if (!run) return;
    const json = scheduleRunToJson(
      run,
      { processes, ...(quantum === undefined ? {} : { quantum }) },
      algorithmName === undefined ? {} : { algorithmName },
    );
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `schedule-${run.algorithmId}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [algorithmName, processes, quantum, run]);

  return (
    <Button size="sm" variant="ghost" onClick={handleExport} disabled={disabled || !run}>
      Export JSON
    </Button>
  );
}
