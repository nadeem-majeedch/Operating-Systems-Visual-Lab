import type { SimulationConfig } from '@/types';
import type { SimulationEngine, SimulationRun } from '../types';
import { validateProcessInput } from './fcfs';
import { byRemainingThenArrival, runScheduler } from './scheduler';
import type { SchedulerPolicy } from './scheduler';
import type { ProcessInput, ScheduleStepData } from './types';

export const SJF_ALGORITHM_ID = 'sjf';
export const SJF_ENGINE_ID = 'sjf-engine';
export const SRTF_ALGORITHM_ID = 'srtf';
export const SRTF_ENGINE_ID = 'srtf-engine';
export const SJF_LAB_ID = 'lab-sjf';

function list(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const SJF_POLICY: SchedulerPolicy = {
  algorithmId: SJF_ALGORITHM_ID,
  labId: SJF_LAB_ID,
  engineId: SJF_ENGINE_ID,
  name: 'Shortest Job First (non-preemptive)',
  description:
    'Dispatches the ready process with the smallest burst time and runs it to completion. Optimal for average waiting time when every process is ready at once.',
  preemptive: false,
  comparator: byRemainingThenArrival,
  chooseWhy: (chosen, ready) => {
    const others = ready.filter((process) => process.id !== chosen.id);
    if (others.length === 0) {
      return `${chosen.name} is the only ready process, so it is dispatched with a burst of ${chosen.burstTime}.`;
    }
    return `${chosen.name} has the shortest burst time (${chosen.burstTime}) among the ${ready.length} ready processes, beating ${list(
      others.map((process) => `${process.name} (${process.burstTime})`),
    )}.`;
  },
  preemptWhy: (running, challenger) =>
    `${running.name} keeps the CPU: this policy is non-preemptive, so ${challenger.name} must wait for the current burst to finish.`,
  initialExplanation:
    'Shortest Job First always dispatches the ready process needing the least CPU time and never interrupts it. Among processes that are ready at the same moment it provably minimises average waiting time, because a short job moved ahead of a long one shortens the wait for everything behind it — but it needs burst times the operating system does not actually know.',
};

const SRTF_POLICY: SchedulerPolicy = {
  algorithmId: SRTF_ALGORITHM_ID,
  labId: SJF_LAB_ID,
  engineId: SRTF_ENGINE_ID,
  name: 'Shortest Remaining Time First',
  description:
    'The preemptive form of SJF: runs the process with the least remaining work and preempts it the moment a shorter job arrives.',
  preemptive: true,
  comparator: byRemainingThenArrival,
  chooseWhy: (chosen, ready) => {
    const others = ready.filter((process) => process.id !== chosen.id);
    if (others.length === 0) {
      return `${chosen.name} is the only ready process, with ${chosen.remaining} unit${
        chosen.remaining === 1 ? '' : 's'
      } of work left.`;
    }
    return `${chosen.name} has the least remaining work (${chosen.remaining}) of the ${ready.length} ready processes.`;
  },
  preemptWhy: (running, challenger) =>
    `${running.name} is preempted because ${challenger.name} arrived with less work left (${challenger.remaining} < ${running.remaining}). SRTF always runs the shortest remaining job, so the newcomer takes the CPU immediately.`,
  initialExplanation:
    'Shortest Remaining Time First compares every arrival against the running process and preempts whenever the newcomer needs less CPU time to finish. Preempting more often lowers average waiting time further than SJF, at the cost of frequent context switches and continuous remaining-time bookkeeping.',
};

export function simulateSjf(
  input: ProcessInput,
  config: SimulationConfig = {},
): SimulationRun<ScheduleStepData> {
  return runScheduler(input, SJF_POLICY, config);
}

export function simulateSrtf(
  input: ProcessInput,
  config: SimulationConfig = {},
): SimulationRun<ScheduleStepData> {
  return runScheduler(input, SRTF_POLICY, config);
}

export const sjfEngine: SimulationEngine<ProcessInput, ScheduleStepData> = {
  id: SJF_ENGINE_ID,
  algorithmId: SJF_ALGORITHM_ID,
  labId: SJF_LAB_ID,
  name: 'Shortest Job First',
  description:
    'Non-preemptive shortest-first scheduling: always run the ready job with the smallest burst time.',
  validate: validateProcessInput,
  run: simulateSjf,
};

export const srtfEngine: SimulationEngine<ProcessInput, ScheduleStepData> = {
  id: SRTF_ENGINE_ID,
  algorithmId: SRTF_ALGORITHM_ID,
  labId: SJF_LAB_ID,
  name: 'Shortest Remaining Time First',
  description:
    'Preemptive shortest-first scheduling: always run the job with the least remaining work.',
  validate: validateProcessInput,
  run: simulateSrtf,
};
