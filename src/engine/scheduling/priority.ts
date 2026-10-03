import type { SimulationConfig } from '@/types';
import type { SimulationEngine, SimulationRun } from '../types';
import { validateProcessInput } from './fcfs';
import { byPriorityThenArrival, runScheduler } from './scheduler';
import type { SchedulerPolicy } from './scheduler';
import type { ProcessInput, ScheduleStepData } from './types';

export const PRIORITY_ALGORITHM_ID = 'priority-scheduling';
export const PRIORITY_ENGINE_ID = 'priority-engine';
export const PRIORITY_PREEMPTIVE_ALGORITHM_ID = 'priority-preemptive';
export const PRIORITY_PREEMPTIVE_ENGINE_ID = 'priority-preemptive-engine';
export const PRIORITY_LAB_ID = 'lab-priority-scheduling';

function rivalList(
  chosen: { id: string; name: string; priority: number },
  ready: readonly { id: string; name: string; priority: number }[],
): string {
  return ready
    .filter((process) => process.id !== chosen.id)
    .map((process) => `${process.name} (priority ${process.priority})`)
    .join(', ');
}

const PRIORITY_POLICY: SchedulerPolicy = {
  algorithmId: PRIORITY_ALGORITHM_ID,
  labId: PRIORITY_LAB_ID,
  engineId: PRIORITY_ENGINE_ID,
  name: 'Priority Scheduling (non-preemptive)',
  description:
    'Always dispatches the ready process with the highest priority and runs it to completion. Without aging, low-priority work can starve.',
  preemptive: false,
  comparator: byPriorityThenArrival,
  chooseWhy: (chosen, ready) => {
    const rivals = rivalList(chosen, ready);
    if (rivals === '') {
      return `${chosen.name} is the only ready process, running at priority ${chosen.priority}.`;
    }
    return `${chosen.name} has the highest priority (${chosen.priority}, lower number wins) among the ${ready.length} ready processes, ahead of ${rivals}.`;
  },
  preemptWhy: (running, challenger) =>
    `${running.name} keeps the CPU: the non-preemptive variant only chooses a new process when the current burst finishes, so ${challenger.name} waits behind it.`,
  initialExplanation:
    'Priority scheduling replaces "who arrived first" with "who matters most": the ready process with the smallest priority number always runs next. The non-preemptive variant never interrupts a burst, so a single long high-priority job can delay everything behind it, and a steady stream of high-priority arrivals can starve low-priority work entirely — the reason real systems add aging.',
};

const PRIORITY_PREEMPTIVE_POLICY: SchedulerPolicy = {
  algorithmId: PRIORITY_PREEMPTIVE_ALGORITHM_ID,
  labId: PRIORITY_LAB_ID,
  engineId: PRIORITY_PREEMPTIVE_ENGINE_ID,
  name: 'Priority Scheduling (preemptive)',
  description:
    'Always runs the ready process with the highest priority, preempting the current one the moment a more important process arrives.',
  preemptive: true,
  comparator: byPriorityThenArrival,
  chooseWhy: (chosen, ready) => {
    const rivals = rivalList(chosen, ready);
    if (rivals === '') {
      return `${chosen.name} is the only ready process, running at priority ${chosen.priority}.`;
    }
    return `${chosen.name} has the highest priority (${chosen.priority}) of the ${ready.length} ready processes, ahead of ${rivals}.`;
  },
  preemptWhy: (running, challenger) =>
    `${running.name} is preempted because ${challenger.name} arrived with a higher priority (${challenger.priority} < ${running.priority}). The preemptive variant always lets the most important ready process hold the CPU.`,
  initialExplanation:
    'The preemptive variant re-evaluates the CPU on every arrival: if the newcomer outranks the running process, it takes over immediately. That gives the best response time for urgent work but increases context switches, and it makes starvation of low-priority processes more likely still — which is why aging exists.',
};

export function simulatePriority(
  input: ProcessInput,
  config: SimulationConfig = {},
): SimulationRun<ScheduleStepData> {
  return runScheduler(input, PRIORITY_POLICY, config);
}

export function simulatePriorityPreemptive(
  input: ProcessInput,
  config: SimulationConfig = {},
): SimulationRun<ScheduleStepData> {
  return runScheduler(input, PRIORITY_PREEMPTIVE_POLICY, config);
}

export const priorityEngine: SimulationEngine<ProcessInput, ScheduleStepData> = {
  id: PRIORITY_ENGINE_ID,
  algorithmId: PRIORITY_ALGORITHM_ID,
  labId: PRIORITY_LAB_ID,
  name: 'Priority Scheduling',
  description:
    'Non-preemptive priority scheduling: run the ready process with the highest priority to completion.',
  validate: validateProcessInput,
  run: simulatePriority,
};

export const priorityPreemptiveEngine: SimulationEngine<ProcessInput, ScheduleStepData> = {
  id: PRIORITY_PREEMPTIVE_ENGINE_ID,
  algorithmId: PRIORITY_PREEMPTIVE_ALGORITHM_ID,
  labId: PRIORITY_LAB_ID,
  name: 'Preemptive Priority Scheduling',
  description:
    'Preemptive priority scheduling: the highest-priority ready process always holds the CPU.',
  validate: validateProcessInput,
  run: simulatePriorityPreemptive,
};
