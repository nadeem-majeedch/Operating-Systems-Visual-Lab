import type { SimulationRun } from '@/engine';
import { PAGING_PRESETS, runPaging, type PagingInput, type PagingPreset, type PagingStepData } from '@/engine';
import type { PagingDraft } from './drafts';

export const PAGING_TOPIC_ID = 'virtual-memory';
export const PAGING_LAB_ID = 'lab-tlb-translation';

export function pagingPresetOptions(): readonly PagingPreset[] {
  return PAGING_PRESETS;
}

/** Assemble an engine input from the workstation's editable draft. */
export function pagingInput(draft: PagingDraft): PagingInput {
  return {
    pageSize: draft.pageSize,
    logicalAddressBits: draft.logicalAddressBits,
    physicalAddressBits: draft.physicalAddressBits,
    tlbSize: draft.tlbSize,
    tlbPolicy: draft.tlbPolicy,
    references: [...draft.references],
    absentPages: [...draft.absentPages],
  };
}

export function runPagingInput(input: PagingInput): SimulationRun<PagingStepData> {
  return runPaging(input);
}
