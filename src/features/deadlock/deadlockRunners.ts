import type { SimulationRun } from '@/engine';
import {
  BANKERS_PRESETS,
  RAG_PRESETS,
  runBankers,
  runRag,
  type BankersInput,
  type BankersStepData,
  type RagInput,
  type RagStepData,
} from '@/engine';

export interface DeadlockPresetOption<TInput> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly input: TInput;
}

export const BANKERS_TOPIC_ID = 'deadlocks';
export const BANKERS_LAB = 'lab-bankers';
export const RAG_LAB = 'lab-wait-for-graph';

export function bankersPresetOptions(): readonly DeadlockPresetOption<BankersInput>[] {
  return BANKERS_PRESETS;
}

export function ragPresetOptions(): readonly DeadlockPresetOption<RagInput>[] {
  return RAG_PRESETS;
}

export function runBankersInput(input: BankersInput): SimulationRun<BankersStepData> {
  return runBankers(input);
}

export function runRagInput(input: RagInput): SimulationRun<RagStepData> {
  return runRag(input);
}
