import type { Matrix } from './types';

/**
 * Pure matrix and vector helpers shared by both deadlock engines.
 *
 * Nothing here touches React or the step model, so every function is directly
 * unit-testable — which matters because the banker's algorithm is easy to get
 * subtly wrong.
 */

/** Row `i`, column `j`, tolerating ragged input. */
export function cell(matrix: Matrix, row: number, column: number): number {
  return matrix[row]?.[column] ?? 0;
}

export function rowOf(matrix: Matrix, index: number): readonly number[] {
  return matrix[index] ?? [];
}

/** `need = max − allocation`, cell by cell. */
export function needMatrix(allocation: Matrix, max: Matrix): number[][] {
  return max.map((maxRow, row) =>
    maxRow.map((maxValue, column) => maxValue - cell(allocation, row, column)),
  );
}

/** Deep copy so callers can mutate a working matrix freely. */
export function cloneMatrix(matrix: Matrix): number[][] {
  return matrix.map((row) => [...row]);
}

export function cloneVector(vector: readonly number[]): number[] {
  return [...vector];
}

export function sumOf(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function vectorAdd(a: readonly number[], b: readonly number[]): number[] {
  const length = Math.max(a.length, b.length);
  const result: number[] = [];
  for (let index = 0; index < length; index += 1) result.push((a[index] ?? 0) + (b[index] ?? 0));
  return result;
}

export function vectorSubtract(a: readonly number[], b: readonly number[]): number[] {
  const length = Math.max(a.length, b.length);
  const result: number[] = [];
  for (let index = 0; index < length; index += 1) result.push((a[index] ?? 0) - (b[index] ?? 0));
  return result;
}

/** True when every entry of `a` is `<=` the matching entry of `b`. */
export function vectorLessOrEqual(a: readonly number[], b: readonly number[]): boolean {
  return a.every((value, index) => value <= (b[index] ?? 0));
}

/** Free units of each resource: instances minus everything allocated. */
export function computeAvailable(instances: readonly number[], allocation: Matrix): number[] {
  return instances.map((total, resource) => {
    let used = 0;
    for (const row of allocation) used += row[resource] ?? 0;
    return total - used;
  });
}

/* -------------------------------------------------------------------------- */
/* The safety algorithm                                                       */
/* -------------------------------------------------------------------------- */

/** One "process Pi can finish" iteration of the safety algorithm. */
export interface SafetyIteration {
  readonly process: number;
  readonly workBefore: readonly number[];
  readonly workAfter: readonly number[];
}

export interface SafetyOutcome {
  readonly safe: boolean;
  /** Process indices in the order they were shown to be completable. */
  readonly sequence: readonly number[];
  /** Process indices that never completed — the reason an unsafe state is unsafe. */
  readonly remaining: readonly number[];
  readonly iterations: readonly SafetyIteration[];
}

/**
 * The banker's safety algorithm.
 *
 * `work` starts as a copy of the available vector. Repeatedly, the lowest-index
 * unfinished process whose whole need vector fits inside `work` is finished and
 * its allocation returned to `work`. If every process finishes the state is
 * safe and `sequence` is a safe sequence; otherwise the state is unsafe.
 *
 * The lowest-index-first rule makes the outcome deterministic, so the same
 * input always yields the same sequence.
 */
export function runSafety(
  need: Matrix,
  allocation: Matrix,
  available: readonly number[],
  processCount: number,
): SafetyOutcome {
  const work = cloneVector(available);
  const finish: boolean[] = Array.from({ length: processCount }, () => false);
  const sequence: number[] = [];
  const iterations: SafetyIteration[] = [];

  let progressed = true;
  while (progressed) {
    progressed = false;
    for (let process = 0; process < processCount; process += 1) {
      if (finish[process]) continue;
      if (!vectorLessOrEqual(rowOf(need, process), work)) continue;

      const workBefore = cloneVector(work);
      const released = rowOf(allocation, process);
      for (let resource = 0; resource < work.length; resource += 1) {
        work[resource] = (work[resource] ?? 0) + (released[resource] ?? 0);
      }
      finish[process] = true;
      sequence.push(process);
      iterations.push({ process, workBefore, workAfter: cloneVector(work) });
      progressed = true;
      // Restart the scan so the lowest-index rule holds across iterations.
      break;
    }
  }

  const remaining = finish
    .map((done, process) => (done ? -1 : process))
    .filter((process) => process >= 0);

  return { safe: remaining.length === 0, sequence, remaining, iterations };
}

/* -------------------------------------------------------------------------- */
/* Cycle detection on a wait-for graph                                        */
/* -------------------------------------------------------------------------- */

/** Directed edges over process indices. */
export type ProcessEdges = readonly (readonly [number, number])[];

/**
 * Find a directed cycle over `nodeCount` process indices.
 *
 * Returns the vertices of the first cycle found (in edge order, without
 * repeating the start) or `null` when the graph is acyclic. Iterating and
 * colouring in index order keeps the result deterministic.
 */
export function findCycle(nodeCount: number, edges: ProcessEdges): number[] | null {
  const adjacency = new Map<number, number[]>();
  for (const [from, to] of edges) {
    const list = adjacency.get(from);
    if (list) list.push(to);
    else adjacency.set(from, [to]);
  }
  for (const list of adjacency.values()) list.sort((a, b) => a - b);

  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;
  const colour: number[] = Array.from({ length: nodeCount }, () => WHITE);
  const stack: number[] = [];

  const visit = (node: number): number[] | null => {
    colour[node] = GREY;
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) {
      if (colour[next] === GREY) {
        const start = stack.indexOf(next);
        return stack.slice(start);
      }
      if (colour[next] === WHITE) {
        const found = visit(next);
        if (found) return found;
      }
    }
    stack.pop();
    colour[node] = BLACK;
    return null;
  };

  for (let node = 0; node < nodeCount; node += 1) {
    if (colour[node] !== WHITE) continue;
    const found = visit(node);
    if (found) return found;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Reduction algorithm (multiple instances)                                   */
/* -------------------------------------------------------------------------- */

export interface ReductionOutcome {
  readonly deadlocked: boolean;
  readonly finish: readonly boolean[];
  /** Process indices that could not be completed. */
  readonly remaining: readonly number[];
  /** Order in which processes were shown to complete. */
  readonly sequence: readonly number[];
  readonly work: readonly number[];
}

/**
 * The deadlock-detection reduction algorithm, for resources with several
 * instances.
 *
 * `finish[i]` starts true for a process with no outstanding request and `work`
 * starts as the available vector; a process whose whole request vector fits is
 * finished and its allocation returned. Any process left unfinished is
 * deadlocked.
 */
export function runReduction(
  allocation: Matrix,
  requests: Matrix,
  available: readonly number[],
  processCount: number,
): ReductionOutcome {
  const work = cloneVector(available);
  const finish: boolean[] = Array.from({ length: processCount }, (_, process) =>
    rowOf(requests, process).every((value) => value === 0),
  );
  const sequence: number[] = [];

  let progressed = true;
  while (progressed) {
    progressed = false;
    for (let process = 0; process < processCount; process += 1) {
      if (finish[process]) continue;
      if (!vectorLessOrEqual(rowOf(requests, process), work)) continue;

      const released = rowOf(allocation, process);
      for (let resource = 0; resource < work.length; resource += 1) {
        work[resource] = (work[resource] ?? 0) + (released[resource] ?? 0);
      }
      finish[process] = true;
      sequence.push(process);
      progressed = true;
      break;
    }
  }

  const remaining = finish
    .map((done, process) => (done ? -1 : process))
    .filter((process) => process >= 0);

  return { deadlocked: remaining.length > 0, finish, remaining, sequence, work };
}
