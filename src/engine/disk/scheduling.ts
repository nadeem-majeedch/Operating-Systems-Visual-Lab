import type { SimulationConfig, ValidationResult } from '@/types';
import { ValidationCollector, assertValid, createSimulationState, createSteps } from '../core';
import type { StepDraft } from '../core';
import type { SimulationEngine, SimulationRun } from '../types';
import type { DiskAlgorithm, DiskDirection, DiskEvent, DiskInput, DiskStepData } from './types';
import {
  DISK_ALGORITHM_IDS,
  DISK_ALGORITHM_LABELS,
  DISK_ALGORITHMS,
  DISK_DIRECTIONS,
  DISK_ENGINE_ID,
  DISK_LAB_ID,
  MAX_DISK_SIZE,
  MAX_REQUESTS,
  MIN_DISK_SIZE,
  MIN_REQUESTS,
} from './types';

export const DISK_SCHEDULING_ALGORITHM_ID = 'fcfs-disk';

const ascending = (a: number, b: number): number => a - b;
const descending = (a: number, b: number): number => b - a;

function opposite(direction: DiskDirection): DiskDirection {
  return direction === 'up' ? 'down' : 'up';
}

function removeOne(values: number[], value: number): void {
  const index = values.indexOf(value);
  if (index >= 0) values.splice(index, 1);
}

function minOf(values: readonly number[]): number {
  return values.reduce((lowest, value) => (value < lowest ? value : lowest), values[0] ?? 0);
}

function maxOf(values: readonly number[]): number {
  return values.reduce((highest, value) => (value > highest ? value : highest), values[0] ?? 0);
}

/** One head movement, before it is turned into an explanatory step. */
export interface DiskMove {
  readonly event: DiskEvent;
  readonly from: number;
  readonly to: number;
  readonly served: number | null;
  readonly direction: DiskDirection;
  readonly reason: string;
}

export function validateDiskInput(input: DiskInput): ValidationResult {
  const collector = new ValidationCollector();

  collector.addIf(
    !DISK_ALGORITHMS.includes(input.algorithm),
    'algorithm',
    `algorithm must be one of ${DISK_ALGORITHMS.join(', ')}`,
  );
  collector.addIf(
    !Number.isInteger(input.diskSize) || input.diskSize < MIN_DISK_SIZE || input.diskSize > MAX_DISK_SIZE,
    'diskSize',
    `diskSize must be an integer between ${MIN_DISK_SIZE} and ${MAX_DISK_SIZE}`,
  );
  collector.addIf(
    !Number.isInteger(input.head) || input.head < 0 || input.head >= input.diskSize,
    'head',
    'head must be a cylinder inside the disk range',
  );
  collector.addIf(!DISK_DIRECTIONS.includes(input.direction), 'direction', 'direction must be up or down');

  collector.addIf(
    input.requests.length < MIN_REQUESTS || input.requests.length > MAX_REQUESTS,
    'requests',
    `between ${MIN_REQUESTS} and ${MAX_REQUESTS} requests are supported`,
  );
  input.requests.forEach((cylinder, index) => {
    collector.addIf(
      !Number.isInteger(cylinder) || cylinder < 0 || cylinder >= input.diskSize,
      `requests[${index}]`,
      `each request must be a cylinder between 0 and ${input.diskSize - 1}`,
    );
  });

  return collector.toResult();
}

/* -------------------------------------------------------------------------- */
/* Movement plans                                                              */
/* -------------------------------------------------------------------------- */

function fcfsMoves(input: DiskInput): DiskMove[] {
  const moves: DiskMove[] = [];
  let head = input.head;
  for (const cylinder of input.requests) {
    moves.push({
      event: 'service',
      from: head,
      to: cylinder,
      served: cylinder,
      direction: input.direction,
      reason: `FCFS serves the queue strictly in arrival order, so request ${cylinder} is next regardless of how far away it is.`,
    });
    head = cylinder;
  }
  return moves;
}

function sstfMoves(input: DiskInput): DiskMove[] {
  const moves: DiskMove[] = [];
  let head = input.head;
  const pending = [...input.requests];
  while (pending.length > 0) {
    let chosen = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < pending.length; index += 1) {
      const cylinder = pending[index]!;
      const distance = Math.abs(cylinder - head);
      const tiedAndLower = distance === bestDistance && cylinder < (pending[chosen] ?? Infinity);
      if (distance < bestDistance || tiedAndLower) {
        bestDistance = distance;
        chosen = index;
      }
    }
    const cylinder = pending[chosen]!;
    pending.splice(chosen, 1);
    moves.push({
      event: 'service',
      from: head,
      to: cylinder,
      served: cylinder,
      direction: input.direction,
      reason:
        bestDistance === 0
          ? `Request ${cylinder} is where the head already sits, so it costs nothing to serve.`
          : `Request ${cylinder} is the nearest to the head at ${head} (distance ${bestDistance}), so SSTF serves it before any request further away.`,
    });
    head = cylinder;
  }
  return moves;
}

/** LOOK and SCAN: sweep to a turnaround point, reverse, and service on the way back. */
function sweepMoves(input: DiskInput, goToEdge: boolean): DiskMove[] {
  const moves: DiskMove[] = [];
  let head = input.head;
  let direction: DiskDirection = input.direction;
  const pending = [...input.requests];

  const service = (cylinder: number): void => {
    moves.push({
      event: 'service',
      from: head,
      to: cylinder,
      served: cylinder,
      direction,
      reason: `Sweeping ${direction}, the head reaches request ${cylinder} and services it on the way.`,
    });
    head = cylinder;
  };

  while (pending.length > 0) {
    const ahead = pending.filter((cylinder) => (direction === 'up' ? cylinder >= head : cylinder <= head));
    ahead.sort(direction === 'up' ? ascending : descending);
    for (const cylinder of ahead) {
      service(cylinder);
      removeOne(pending, cylinder);
    }

    if (pending.length === 0) break;

    if (goToEdge) {
      const edge = direction === 'up' ? input.diskSize - 1 : 0;
      if (head !== edge) {
        moves.push({
          event: 'turn',
          from: head,
          to: edge,
          served: null,
          direction,
          reason: `No requests are left ahead, so SCAN carries the head all the way to cylinder ${edge} before reversing. Visiting the edge even when it holds no request is what bounds every request's waiting time.`,
        });
        head = edge;
      }
    }
    direction = opposite(direction);
  }

  return moves;
}

/** C-LOOK and C-SCAN: always sweep one way, wrapping back without servicing the return. */
function circularMoves(input: DiskInput, goToEdge: boolean): DiskMove[] {
  const moves: DiskMove[] = [];
  let head = input.head;
  const direction: DiskDirection = input.direction;
  const pending = [...input.requests];

  const service = (cylinder: number): void => {
    moves.push({
      event: 'service',
      from: head,
      to: cylinder,
      served: cylinder,
      direction,
      reason: `The head sweeps ${direction} only, so it services request ${cylinder} as it passes.`,
    });
    head = cylinder;
  };

  while (pending.length > 0) {
    const ahead = pending.filter((cylinder) => (direction === 'up' ? cylinder >= head : cylinder <= head));
    ahead.sort(direction === 'up' ? ascending : descending);
    for (const cylinder of ahead) {
      service(cylinder);
      removeOne(pending, cylinder);
    }

    if (pending.length === 0) break;

    if (goToEdge) {
      const edge = direction === 'up' ? input.diskSize - 1 : 0;
      if (head !== edge) {
        moves.push({
          event: 'turn',
          from: head,
          to: edge,
          served: null,
          direction,
          reason: `The sweep continues to the end of the disk at cylinder ${edge}. C-SCAN always travels to the edge, because the return trip is a single fast seek it never services.`,
        });
        head = edge;
      }
      const other = direction === 'up' ? 0 : input.diskSize - 1;
      moves.push({
        event: 'wrap',
        from: head,
        to: other,
        served: null,
        direction,
        reason: `On reaching cylinder ${edge}, C-SCAN returns to cylinder ${other} without servicing anything on the way back, then continues sweeping ${direction}. Treating the disk as a circle makes service far more uniform than SCAN.`,
      });
      head = other;
    } else {
      const target = direction === 'up' ? minOf(pending) : maxOf(pending);
      if (head !== target) {
        moves.push({
          event: 'wrap',
          from: head,
          to: target,
          served: null,
          direction,
          reason: `C-LOOK jumps straight from the last request in the sweep to the first pending request at cylinder ${target}, then keeps sweeping ${direction}. It skips the empty part of the disk instead of running out to the edge like C-SCAN.`,
        });
        head = target;
      }
    }
  }

  return moves;
}

/** The ordered head movements for a policy — exported so tests can assert order and distance. */
export function diskMoves(input: DiskInput): DiskMove[] {
  switch (input.algorithm) {
    case 'fcfs':
      return fcfsMoves(input);
    case 'sstf':
      return sstfMoves(input);
    case 'scan':
      return sweepMoves(input, true);
    case 'look':
      return sweepMoves(input, false);
    case 'c-scan':
      return circularMoves(input, true);
    case 'c-look':
      return circularMoves(input, false);
  }
}

/** Cylinders serviced in order, for a policy over the given queue. */
export function diskServiceOrder(input: DiskInput): number[] {
  return diskMoves(input)
    .filter((move) => move.served !== null)
    .map((move) => move.served as number);
}

/** Total head movement for a policy over the given queue. */
export function diskTotalMovement(input: DiskInput): number {
  return diskMoves(input).reduce((total, move) => total + Math.abs(move.to - move.from), 0);
}

/* -------------------------------------------------------------------------- */
/* Steps                                                                       */
/* -------------------------------------------------------------------------- */

export function diskStepMetrics(data: DiskStepData): Record<string, number> {
  return {
    requests: data.requestCount,
    serviced: data.servicedCount,
    head: data.head,
    movement: data.movement,
    totalMovement: data.totalMovement,
    averageSeek: data.averageSeek,
    worstSeek: data.worstSeek,
  };
}

const POLICY_INTRO: Readonly<Record<DiskAlgorithm, string>> = {
  fcfs: 'FCFS services the queue strictly in arrival order, so the head oscillates across the disk exactly as the requests arrived.',
  sstf: 'SSTF always serves the request nearest the head, which minimises each individual hop but can leave far-away requests waiting indefinitely.',
  scan: 'SCAN is the elevator: the head sweeps to the physical end of the disk in one direction, servicing requests on the way, then reverses.',
  'c-scan': 'C-SCAN sweeps in one direction only, returns to the start without servicing anything, and sweeps again — treating the disk as circular.',
  look: 'LOOK sweeps like SCAN but reverses at the last pending request instead of travelling to the empty end of the disk.',
  'c-look': 'C-LOOK sweeps in one direction only and jumps back to the first pending request, never visiting an end it has no reason to reach.',
};

const DIRECTIONAL: readonly DiskAlgorithm[] = ['scan', 'c-scan', 'look', 'c-look'];

/**
 * Simulate one disk-scheduling policy.
 *
 * The run is deterministic: the same queue, head, direction and policy always
 * produce the same movements, service order and distances. The initial step
 * shows the starting head; every subsequent step is one head movement, so the
 * timeline is the service path.
 */
export function runDiskScheduling(
  input: DiskInput,
  config: SimulationConfig = {},
): SimulationRun<DiskStepData> {
  assertValid(validateDiskInput(input), 'Disk scheduling');

  const { algorithm, diskSize, head, requests, direction } = input;
  const algorithmId = DISK_ALGORITHM_IDS[algorithm];
  const algorithmLabel = DISK_ALGORITHM_LABELS[algorithm];
  const moves = diskMoves(input);

  const servicedOrder: number[] = [];
  const pending = [...requests];
  let currentHead = head;
  let currentDirection: DiskDirection = direction;
  let totalMovement = 0;
  let worstSeek = 0;

  const makeData = (
    event: DiskEvent,
    overrides: Partial<DiskStepData> = {},
  ): DiskStepData => ({
    kind: 'disk',
    algorithm,
    event,
    diskSize,
    head: currentHead,
    previousHead: currentHead,
    direction: currentDirection,
    servedCylinder: null,
    servicedOrder: [...servicedOrder],
    pending: [...pending],
    queue: [...requests],
    movement: 0,
    totalMovement,
    servicedCount: servicedOrder.length,
    requestCount: requests.length,
    averageSeek: servicedOrder.length === 0 ? 0 : totalMovement / servicedOrder.length,
    worstSeek,
    summary: `${algorithmLabel}: ${servicedOrder.length} of ${requests.length} requests served, ${totalMovement} cylinders travelled.`,
    reason: '',
    ...overrides,
  });

  const drafts: StepDraft<DiskStepData>[] = [];

  /* --------------------------------------------------------------------- init */
  {
    const data = makeData('init', {
      reason: `The head starts at cylinder ${head}${
        DIRECTIONAL.includes(algorithm) ? `, sweeping ${direction}` : ''
      }.`,
      summary: `${algorithmLabel}: head at cylinder ${head}, ${requests.length} request${
        requests.length === 1 ? '' : 's'
      } queued.`,
    });
    drafts.push({
      label: `Head at ${head}`,
      description: `${requests.length} request${requests.length === 1 ? '' : 's'} queued across ${diskSize} cylinders.`,
      explanation: `${POLICY_INTRO[algorithm]} The head begins at cylinder ${head}${
        DIRECTIONAL.includes(algorithm) ? ` and the sweep direction is ${direction}` : ''
      }. The queue is ${requests.length > 0 ? requests.join(', ') : 'empty'}.`,
      clock: 0,
      data,
      highlights: [],
      metrics: diskStepMetrics(data),
    });
  }

  /* ----------------------------------------------------------------- moves -- */
  for (const move of moves) {
    const movement = Math.abs(move.to - move.from);
    totalMovement += movement;
    if (movement > worstSeek) worstSeek = movement;
    currentHead = move.to;
    currentDirection = move.direction;
    if (move.event === 'service' && move.served !== null) {
      servicedOrder.push(move.served);
      removeOne(pending, move.served);
    }

    const label =
      move.event === 'service'
        ? `Service ${move.served}`
        : move.event === 'turn'
          ? `Seek to ${move.to}`
          : `Wrap to ${move.to}`;

    const description =
      move.event === 'service'
        ? `Head moves ${move.from} → ${move.to} (${movement}) and services cylinder ${move.served}.`
        : move.event === 'turn'
          ? `Head travels ${move.from} → ${move.to} (${movement}) without servicing a request.`
          : `Head jumps ${move.from} → ${move.to} (${movement}) without servicing a request.`;

    const explanation =
      move.event === 'service'
        ? `${move.reason} Total travel is now ${totalMovement} cylinders over ${servicedOrder.length} request${
            servicedOrder.length === 1 ? '' : 's'
          }, an average of ${(totalMovement / servicedOrder.length).toFixed(1)} per request.`
        : `${move.reason} This movement adds ${movement} cylinders to the total without servicing any request — exactly the overhead that separates the policies.`;

    const data = makeData(move.event, {
      previousHead: move.from,
      servedCylinder: move.served,
      movement,
      reason: move.reason,
      summary: `${algorithmLabel}: moved ${move.from} → ${move.to} (${movement}); total ${totalMovement}.`,
    });

    drafts.push({
      label,
      description,
      explanation,
      clock: drafts.length,
      data,
      highlights: [],
      metrics: diskStepMetrics(data),
    });
  }

  const steps = createSteps(drafts);
  const last = steps[steps.length - 1];
  const finalData = (last?.data ?? makeData('init')) as DiskStepData;

  return {
    algorithmId,
    labId: DISK_LAB_ID,
    input: {
      algorithm,
      diskSize,
      head,
      requests: requests.length,
      direction,
      steps: steps.length,
    },
    steps,
    state: createSimulationState<DiskStepData>({
      labId: DISK_LAB_ID,
      algorithmId,
      steps,
      parameters: { algorithm, diskSize, head, direction },
      speed: config.speed,
    }),
    summary: {
      requests: requests.length,
      diskSize,
      head,
      serviced: finalData.servicedCount,
      totalMovement: finalData.totalMovement,
      averageSeek: finalData.averageSeek,
      worstSeek: finalData.worstSeek,
      steps: steps.length,
    },
  };
}

export const diskSchedulingEngine: SimulationEngine<DiskInput, DiskStepData> = {
  id: DISK_ENGINE_ID,
  algorithmId: DISK_SCHEDULING_ALGORITHM_ID,
  labId: DISK_LAB_ID,
  name: 'Disk Head Scheduling',
  description:
    'Move the head across a cylinder range under FCFS, SSTF, SCAN, C-SCAN, LOOK or C-LOOK and total the distance travelled.',
  validate: validateDiskInput,
  run: runDiskScheduling,
};
