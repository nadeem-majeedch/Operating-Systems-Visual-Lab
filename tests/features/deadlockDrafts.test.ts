import { describe, expect, it } from 'vitest';
import { BANKERS_PRESETS, RAG_PRESETS, validateBankersInput, validateRagInput } from '@/engine';
import type { BankersInput, RagInput } from '@/engine';
import { draftFromInput, draftFromRagInput } from '@/features/deadlock/drafts';

function bankersInputFromDraft(
  draft: ReturnType<typeof draftFromInput>,
): BankersInput {
  return {
    processes: draft.processes,
    resources: draft.resources,
    allocation: draft.allocation,
    max: draft.max,
    available: draft.available,
    ...(draft.requestProcess >= 0
      ? { request: { process: draft.requestProcess, resources: draft.request } }
      : {}),
  };
}

function ragInputFromDraft(draft: ReturnType<typeof draftFromRagInput>): RagInput {
  return {
    processes: draft.processes,
    resources: draft.resources,
    instances: draft.instances,
    allocation: draft.allocation,
    requests: draft.requests,
  };
}

describe('deadlock draft adapters', () => {
  it('round-trips every banker preset and keeps it valid', () => {
    for (const preset of BANKERS_PRESETS) {
      const draft = draftFromInput(preset.input);
      expect(draft.processes).toEqual(preset.input.processes);
      expect(draft.allocation).toEqual(preset.input.allocation);
      expect(validateBankersInput(bankersInputFromDraft(draft))).toEqual({ valid: true });
    }
  });

  it('preserves a pending request and clears it when absent', () => {
    const withRequest = draftFromInput(BANKERS_PRESETS[1]!.input);
    expect(withRequest.requestProcess).toBe(BANKERS_PRESETS[1]!.input.request?.process);
    expect(withRequest.request).toEqual(BANKERS_PRESETS[1]!.input.request?.resources);

    const withoutRequest = draftFromInput(BANKERS_PRESETS[0]!.input);
    expect(withoutRequest.requestProcess).toBe(-1);
    expect(withoutRequest.request).toHaveLength(3);
  });

  it('does not alias the preset matrices', () => {
    const draft = draftFromInput(BANKERS_PRESETS[0]!.input);
    draft.allocation[0]![0] = 99;
    expect(BANKERS_PRESETS[0]!.input.allocation[0]?.[0]).toBe(0);
  });

  it('round-trips every graph preset and keeps it valid', () => {
    for (const preset of RAG_PRESETS) {
      const draft = draftFromRagInput(preset.input);
      expect(draft.instances).toEqual(preset.input.instances);
      expect(validateRagInput(ragInputFromDraft(draft))).toEqual({ valid: true });
    }
  });
});
