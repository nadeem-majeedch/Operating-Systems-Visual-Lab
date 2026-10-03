import type { BankersInput, RagInput } from '@/engine';

/** Mutable editing shape for the Banker's matrices. */
export interface BankersDraft {
  processes: string[];
  resources: string[];
  allocation: number[][];
  max: number[][];
  available: number[];
  /** `-1` means the draft has no pending request. */
  requestProcess: number;
  request: number[];
}

/** Mutable editing shape for a resource-allocation graph. */
export interface RagDraft {
  processes: string[];
  resources: string[];
  instances: number[];
  allocation: number[][];
  requests: number[][];
}

export function draftFromInput(input: BankersInput): BankersDraft {
  return {
    processes: [...input.processes],
    resources: [...input.resources],
    allocation: input.allocation.map((row) => [...row]),
    max: input.max.map((row) => [...row]),
    available: [...input.available],
    requestProcess: input.request ? input.request.process : -1,
    request: input.request
      ? [...input.request.resources]
      : Array.from({ length: input.resources.length }, () => 0),
  };
}

export function draftFromRagInput(input: RagInput): RagDraft {
  return {
    processes: [...input.processes],
    resources: [...input.resources],
    instances: [...input.instances],
    allocation: input.allocation.map((row) => [...row]),
    requests: input.requests.map((row) => [...row]),
  };
}
