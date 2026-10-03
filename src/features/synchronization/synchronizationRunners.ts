import type { SimulationRun, SyncKind, SyncStepData } from '@/engine';
import {
  PHILOSOPHERS_PRESETS,
  PRODUCER_CONSUMER_PRESETS,
  RACE_PRESETS,
  READERS_WRITERS_PRESETS,
  runPhilosophers,
  runProducerConsumer,
  runRace,
  runReadersWriters,
} from '@/engine';

export interface SyncPresetOption {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

/** The presets a given simulation offers, in display order. */
export function presetsFor(kind: SyncKind): readonly SyncPresetOption[] {
  switch (kind) {
    case 'race':
      return RACE_PRESETS;
    case 'producer-consumer':
      return PRODUCER_CONSUMER_PRESETS;
    case 'philosophers':
      return PHILOSOPHERS_PRESETS;
    case 'readers-writers':
      return READERS_WRITERS_PRESETS;
  }
}

export function defaultPresetId(kind: SyncKind): string {
  return presetsFor(kind)[0]?.id ?? '';
}

/** Resolve a preset id (falling back to the first preset) and run it. */
export function runSynchronizationPreset(
  kind: SyncKind,
  presetId: string,
): SimulationRun<SyncStepData> {
  switch (kind) {
    case 'race': {
      const preset = RACE_PRESETS.find((item) => item.id === presetId) ?? RACE_PRESETS[0]!;
      return runRace(preset.input);
    }
    case 'producer-consumer': {
      const preset =
        PRODUCER_CONSUMER_PRESETS.find((item) => item.id === presetId) ??
        PRODUCER_CONSUMER_PRESETS[0]!;
      return runProducerConsumer(preset.input);
    }
    case 'philosophers': {
      const preset =
        PHILOSOPHERS_PRESETS.find((item) => item.id === presetId) ?? PHILOSOPHERS_PRESETS[0]!;
      return runPhilosophers(preset.input);
    }
    case 'readers-writers': {
      const preset =
        READERS_WRITERS_PRESETS.find((item) => item.id === presetId) ?? READERS_WRITERS_PRESETS[0]!;
      return runReadersWriters(preset.input);
    }
  }
}

/** Lab, algorithm and stage copy for each simulation. */
export const SYNC_CONFIG: Readonly<
  Record<SyncKind, { labId: string; algorithmId: string; topicId: string; stageTitle: string }>
> = {
  race: {
    labId: 'lab-mutex',
    algorithmId: 'mutex',
    topicId: 'synchronization',
    stageTitle: 'Process A, Process B and the shared counter',
  },
  'producer-consumer': {
    labId: 'lab-bounded-buffer',
    algorithmId: 'bounded-buffer',
    topicId: 'synchronization',
    stageTitle: 'Producers, consumers and the bounded buffer',
  },
  philosophers: {
    labId: 'lab-dining-philosophers',
    algorithmId: 'dining-philosophers',
    topicId: 'synchronization',
    stageTitle: 'Five philosophers and five forks',
  },
  'readers-writers': {
    labId: 'lab-readers-writers',
    algorithmId: 'readers-writers',
    topicId: 'synchronization',
    stageTitle: 'Readers and writers sharing the data',
  },
};
