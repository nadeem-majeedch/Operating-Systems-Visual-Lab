import type { PagingInput, PagingPreset, TlbPolicy } from '@/engine';

/** Editable state behind the paging workstation. */
export interface PagingDraft {
  pageSize: number;
  logicalAddressBits: number;
  physicalAddressBits: number;
  tlbSize: number;
  tlbPolicy: TlbPolicy;
  references: number[];
  absentPages: number[];
}

export function draftFromPreset(preset: PagingPreset): PagingDraft {
  return draftFromInput(preset.input);
}

export function draftFromInput(input: PagingInput): PagingDraft {
  return {
    pageSize: input.pageSize,
    logicalAddressBits: input.logicalAddressBits,
    physicalAddressBits: input.physicalAddressBits,
    tlbSize: input.tlbSize,
    tlbPolicy: input.tlbPolicy,
    references: [...input.references],
    absentPages: [...input.absentPages],
  };
}
