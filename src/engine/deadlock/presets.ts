import type { BankersInput, RagInput } from './types';

export interface DeadlockPreset<TInput> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly input: TInput;
}

/**
 * Banker's algorithm scenarios.
 *
 * `bankers-classic` is the five-process, three-resource table used in most
 * textbooks. The two request presets differ only in the request vector: one is
 * grantable because a safe sequence survives, the other is not and is rolled
 * back. `bankers-unsafe` is a small state with no safe sequence at all.
 */
export const BANKERS_PRESETS: readonly DeadlockPreset<BankersInput>[] = [
  {
    id: 'bankers-classic',
    name: 'Classic safe state',
    description: 'The textbook 5×3 example. A full safe sequence exists.',
    input: {
      processes: ['P0', 'P1', 'P2', 'P3', 'P4'],
      resources: ['A', 'B', 'C'],
      allocation: [
        [0, 1, 0],
        [2, 0, 0],
        [3, 0, 2],
        [2, 1, 1],
        [0, 0, 2],
      ],
      max: [
        [7, 5, 3],
        [3, 2, 2],
        [9, 0, 2],
        [2, 2, 2],
        [4, 3, 3],
      ],
      available: [3, 3, 2],
    },
  },
  {
    id: 'bankers-request-granted',
    name: 'Request that can be granted',
    description: 'P1 asks for [1, 0, 2]; the safety check still succeeds.',
    input: {
      processes: ['P0', 'P1', 'P2', 'P3', 'P4'],
      resources: ['A', 'B', 'C'],
      allocation: [
        [0, 1, 0],
        [2, 0, 0],
        [3, 0, 2],
        [2, 1, 1],
        [0, 0, 2],
      ],
      max: [
        [7, 5, 3],
        [3, 2, 2],
        [9, 0, 2],
        [2, 2, 2],
        [4, 3, 3],
      ],
      available: [3, 3, 2],
      request: { process: 1, resources: [1, 0, 2] },
    },
  },
  {
    id: 'bankers-request-deferred',
    name: 'Request that must wait',
    description: 'P4 asks for [3, 3, 0]; the state would become unsafe, so it is rolled back.',
    input: {
      processes: ['P0', 'P1', 'P2', 'P3', 'P4'],
      resources: ['A', 'B', 'C'],
      allocation: [
        [0, 1, 0],
        [2, 0, 0],
        [3, 0, 2],
        [2, 1, 1],
        [0, 0, 2],
      ],
      max: [
        [7, 5, 3],
        [3, 2, 2],
        [9, 0, 2],
        [2, 2, 2],
        [4, 3, 3],
      ],
      available: [3, 3, 2],
      request: { process: 4, resources: [3, 3, 0] },
    },
  },
  {
    id: 'bankers-unsafe',
    name: 'Unsafe state',
    description: 'Three processes, two resources, and no safe sequence.',
    input: {
      processes: ['P1', 'P2', 'P3'],
      resources: ['A', 'B'],
      allocation: [
        [1, 0],
        [0, 1],
        [0, 1],
      ],
      max: [
        [2, 0],
        [1, 2],
        [1, 2],
      ],
      available: [0, 1],
    },
  },
];

/**
 * Resource-allocation graph scenarios.
 *
 * The third preset is the important one: the collapsed wait-for graph shows a
 * cycle, yet the resources have several instances so the reduction algorithm
 * proves the system is not deadlocked.
 */
export const RAG_PRESETS: readonly DeadlockPreset<RagInput>[] = [
  {
    id: 'rag-cycle',
    name: 'Deadlock (cycle)',
    description: 'Three processes each hold one resource and wait for the next — a circular wait.',
    input: {
      processes: ['P1', 'P2', 'P3'],
      resources: ['R1', 'R2', 'R3'],
      instances: [1, 1, 1],
      allocation: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      requests: [
        [0, 1, 0],
        [0, 0, 1],
        [1, 0, 0],
      ],
    },
  },
  {
    id: 'rag-acyclic',
    name: 'No deadlock',
    description: 'A chain of waits that never loops back on itself.',
    input: {
      processes: ['P1', 'P2', 'P3'],
      resources: ['R1', 'R2', 'R3'],
      instances: [1, 1, 1],
      allocation: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      requests: [
        [0, 1, 0],
        [0, 0, 1],
        [0, 0, 0],
      ],
    },
  },
  {
    id: 'rag-instances',
    name: 'Cycle, but not deadlocked',
    description: 'Multiple instances of A let the reduction finish every process despite a cycle.',
    input: {
      processes: ['P1', 'P2'],
      resources: ['A', 'B'],
      instances: [2, 1],
      allocation: [
        [1, 0],
        [0, 1],
      ],
      requests: [
        [0, 1],
        [1, 0],
      ],
    },
  },
];
