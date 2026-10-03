import type { ValidationResult } from '@/types';
import { ValidationCollector } from '../core';
import type { Process } from './types';
import { MAX_PRIORITY, MIN_PRIORITY } from './types';

export const MAX_PROCESSES = 16;
export { MAX_PRIORITY, MIN_PRIORITY };

/** Collect every problem with a process table into a shared collector. */
export function collectProcessIssues(
  collector: ValidationCollector,
  processes: readonly Process[],
): void {
  collector.addIf(processes.length === 0, 'processes', 'at least one process is required');
  collector.addIf(
    processes.length > MAX_PROCESSES,
    'processes',
    `at most ${MAX_PROCESSES} processes are supported (received ${processes.length})`,
  );

  const seen = new Set<string>();
  processes.forEach((process, index) => {
    const path = `processes[${index}]`;
    collector.addIf(process.id.trim() === '', `${path}.id`, 'id must not be empty');
    collector.addIf(seen.has(process.id), `${path}.id`, `duplicate id "${process.id}"`);
    collector.addIf(process.name.trim() === '', `${path}.name`, 'name must not be empty');
    collector
      .addIf(
        !Number.isInteger(process.arrivalTime) || process.arrivalTime < 0,
        `${path}.arrivalTime`,
        'arrival time must be a non-negative integer',
      )
      .addIf(
        !Number.isInteger(process.burstTime) || process.burstTime <= 0,
        `${path}.burstTime`,
        'burst time must be a positive integer',
      );
    if (process.priority !== undefined) {
      collector.addIf(
        !Number.isInteger(process.priority) ||
          process.priority < MIN_PRIORITY ||
          process.priority > MAX_PRIORITY,
        `${path}.priority`,
        `priority must be an integer between ${MIN_PRIORITY} and ${MAX_PRIORITY}`,
      );
    }
    seen.add(process.id);
  });
}

/** Validate a plain process table (used by non-preemptive engines). */
export function validateProcesses(processes: readonly Process[]): ValidationResult {
  const collector = new ValidationCollector();
  collectProcessIssues(collector, processes);
  return collector.toResult();
}
