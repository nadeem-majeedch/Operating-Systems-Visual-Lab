import type { PageReplacementInput } from './types';

export interface PageReplacementPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly input: PageReplacementInput;
}

/**
 * Deterministic reference strings.
 *
 * They are chosen so the four policies visibly disagree and the requested edge
 * cases are all reachable from the UI: a single frame, more frames than distinct
 * pages, a repeated page, and the classic Bélády anomaly string.
 */
export const PAGE_REPLACEMENT_PRESETS: readonly PageReplacementPreset[] = [
  {
    id: 'repl-basic',
    name: 'Basic string',
    description: 'The textbook seven-page walk over three frames under FIFO.',
    input: {
      algorithm: 'fifo',
      frameCount: 3,
      referenceString: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3],
    },
  },
  {
    id: 'repl-belady',
    name: "Bélády's anomaly",
    description: 'Four frames fault more than three under FIFO — adding memory makes it worse.',
    input: {
      algorithm: 'fifo',
      frameCount: 4,
      referenceString: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5],
    },
  },
  {
    id: 'repl-lru-locality',
    name: 'LRU exploits locality',
    description: 'The same anomaly string, but LRU never does worse with more frames.',
    input: {
      algorithm: 'lru',
      frameCount: 3,
      referenceString: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5],
    },
  },
  {
    id: 'repl-optimal',
    name: 'Optimal bound',
    description: 'OPT sees the future and faults the least on the basic string.',
    input: {
      algorithm: 'optimal',
      frameCount: 3,
      referenceString: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3],
    },
  },
  {
    id: 'repl-clock',
    name: 'Second Chance (Clock)',
    description: 'A clock hand and one reference bit approximate LRU cheaply.',
    input: {
      algorithm: 'clock',
      frameCount: 3,
      referenceString: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5],
    },
  },
  {
    id: 'repl-one-frame',
    name: 'A single frame',
    description: 'With one frame every reference after the first faults — the worst case.',
    input: {
      algorithm: 'fifo',
      frameCount: 1,
      referenceString: [1, 2, 1, 2, 1],
    },
  },
  {
    id: 'repl-many-frames',
    name: 'More frames than pages',
    description: 'Five frames for three distinct pages — once warm, nothing is ever evicted.',
    input: {
      algorithm: 'lru',
      frameCount: 5,
      referenceString: [1, 2, 3, 1, 2, 3],
    },
  },
];

export function findPageReplacementPreset(id: string): PageReplacementPreset | undefined {
  return PAGE_REPLACEMENT_PRESETS.find((preset) => preset.id === id);
}
