import type { ValidationResult } from '@/types';
import { ValidationCollector } from '../core';
import type { ProcessLifecycleInput } from './types';
import { MAX_PRIORITY, MAX_SEEDS, MIN_PRIORITY } from './types';

/** Validate a single authored scenario before it is ever simulated. */
export function validateLifecycleInput(input: ProcessLifecycleInput): ValidationResult {
  const collector = new ValidationCollector();
  const { seeds, script = [] } = input;

  collector.addIf(seeds.length === 0, 'seeds', 'at least one process is required');
  collector.addIf(
    seeds.length > MAX_SEEDS,
    'seeds',
    `at most ${MAX_SEEDS} processes are supported (received ${seeds.length})`,
  );

  const seen = new Set<string>();
  seeds.forEach((seed, index) => {
    const path = `seeds[${index}]`;
    collector.addIf(seed.name.trim() === '', `${path}.name`, 'name must not be empty');
    collector.addIf(seen.has(seed.name), `${path}.name`, `duplicate process name "${seed.name}"`);
    if (seed.priority !== undefined) {
      collector.addIf(
        !Number.isInteger(seed.priority) ||
          seed.priority < MIN_PRIORITY ||
          seed.priority > MAX_PRIORITY,
        `${path}.priority`,
        `priority must be an integer between ${MIN_PRIORITY} and ${MAX_PRIORITY}`,
      );
    }
    if (seed.burstTime !== undefined) {
      collector.addIf(
        !Number.isInteger(seed.burstTime) || seed.burstTime <= 0,
        `${path}.burstTime`,
        'burst time must be a positive integer',
      );
    }
    seen.add(seed.name);
  });

  // A script may only address processes that the seeds or earlier steps define.
  const known = new Set(seeds.map((seed) => seed.name));
  script.forEach((step, index) => {
    const path = `script[${index}]`;
    if (step.action === 'create') {
      collector.addIf(
        known.has(step.name),
        `${path}.name`,
        `"${step.name}" is already defined by an earlier step`,
      );
      known.add(step.name);
      return;
    }
    if (step.action === 'tick') {
      collector.addIf(
        step.units !== undefined && (!Number.isInteger(step.units) || step.units < 1),
        `${path}.units`,
        'tick units must be a positive integer',
      );
      return;
    }
    if (step.action === 'schedule') return;
    collector.addIf(!known.has(step.name), `${path}.name`, `unknown process "${step.name}"`);
  });

  return collector.toResult();
}
