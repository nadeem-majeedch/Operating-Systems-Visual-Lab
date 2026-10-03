import type { SimulationConfig, ValidationResult } from '@/types';
import { ValidationCollector, assertValid, createSimulationState, createSteps } from '../core';
import type { StepDraft } from '../core';
import type { SimulationEngine, SimulationRun } from '../types';
import type {
  FrameSlotView,
  PageReplacementInput,
  PageReplacementStepData,
  ReplacementEvent,
} from './types';
import {
  MAX_FRAMES,
  MAX_PAGE_NUMBER,
  MAX_REFERENCES,
  MIN_FRAMES,
  MIN_PAGE_NUMBER,
  MIN_REFERENCES,
  PAGE_REPLACEMENT_ENGINE_ID,
  PAGE_REPLACEMENT_LAB_ID,
  REPLACEMENT_ALGORITHM_IDS,
  REPLACEMENT_ALGORITHM_LABELS,
  REPLACEMENT_ALGORITHMS,
} from './types';

export const PAGE_REPLACEMENT_ALGORITHM_ID = 'fifo-page';

export function validatePageReplacementInput(input: PageReplacementInput): ValidationResult {
  const collector = new ValidationCollector();

  collector.addIf(
    !REPLACEMENT_ALGORITHMS.includes(input.algorithm),
    'algorithm',
    `algorithm must be one of ${REPLACEMENT_ALGORITHMS.join(', ')}`,
  );
  collector.addIf(
    !Number.isInteger(input.frameCount) || input.frameCount < MIN_FRAMES || input.frameCount > MAX_FRAMES,
    'frameCount',
    `frameCount must be an integer between ${MIN_FRAMES} and ${MAX_FRAMES}`,
  );
  collector.addIf(
    input.referenceString.length < MIN_REFERENCES || input.referenceString.length > MAX_REFERENCES,
    'referenceString',
    `between ${MIN_REFERENCES} and ${MAX_REFERENCES} references are supported`,
  );
  input.referenceString.forEach((page, index) => {
    collector.addIf(
      !Number.isInteger(page) || page < MIN_PAGE_NUMBER || page > MAX_PAGE_NUMBER,
      `referenceString[${index}]`,
      `each reference must be an integer between ${MIN_PAGE_NUMBER} and ${MAX_PAGE_NUMBER}`,
    );
  });

  return collector.toResult();
}

export function pageReplacementStepMetrics(data: PageReplacementStepData): Record<string, number> {
  return {
    references: data.referenceCount,
    hits: data.hits,
    faults: data.faults,
    replacements: data.replacements,
    hitRate: data.hitRate,
    faultRate: data.faultRate,
    frameCount: data.frameCount,
  };
}

interface Slot {
  page: number | null;
  referenced: boolean;
  /** Reference index of the page's last use — drives LRU. */
  recency: number;
  /** Reference index at which the page was loaded — drives FIFO. */
  loadedAt: number;
}

interface MutableState {
  slots: Slot[];
  /** Clock hand position. */
  hand: number;
  hits: number;
  faults: number;
  replacements: number;
}

function emptySlot(): Slot {
  return { page: null, referenced: false, recency: -1, loadedAt: -1 };
}

/** Reference index of the next use of `page` strictly after `from`, or Infinity. */
function nextUse(referenceString: readonly number[], from: number, page: number): number {
  for (let index = from + 1; index < referenceString.length; index += 1) {
    if (referenceString[index] === page) return index;
  }
  return Number.POSITIVE_INFINITY;
}

function firstMinimum(slots: readonly Slot[], key: (slot: Slot) => number): number {
  let victim = -1;
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index]!;
    if (slot.page === null) continue;
    const value = key(slot);
    if (value < best) {
      best = value;
      victim = index;
    }
  }
  return victim;
}

/**
 * Simulate one page-replacement policy over a reference string.
 *
 * The run is deterministic: the same string, frame count and policy always
 * produce the same frames, victims and counters, so any run can be replayed and
 * asserted against. The initial step describes the empty frame set, then each
 * reference contributes exactly one step — a hit, a fault into a free frame, or
 * a fault that replaces a victim — so the timeline lines up one-to-one with the
 * reference string.
 */
export function runPageReplacement(
  input: PageReplacementInput,
  config: SimulationConfig = {},
): SimulationRun<PageReplacementStepData> {
  assertValid(validatePageReplacementInput(input), 'Page replacement');

  const { algorithm, frameCount, referenceString } = input;
  const algorithmId = REPLACEMENT_ALGORITHM_IDS[algorithm];
  const algorithmLabel = REPLACEMENT_ALGORITHM_LABELS[algorithm];

  const state: MutableState = {
    slots: Array.from({ length: frameCount }, emptySlot),
    hand: 0,
    hits: 0,
    faults: 0,
    replacements: 0,
  };

  const total = referenceString.length;

  const snapshot = (event: ReplacementEvent, summary: string): PageReplacementStepData => {
    const frames: FrameSlotView[] = state.slots.map((slot, frame) => ({
      frame,
      page: slot.page,
      referenced: algorithm === 'clock' ? slot.referenced : false,
      recency: slot.recency,
      loadedAt: slot.loadedAt,
      active: false,
      victim: false,
      hand: algorithm === 'clock' && frame === state.hand,
    }));
    return {
      kind: 'page-replacement',
      algorithm,
      event,
      referenceIndex: -1,
      referenceCount: total,
      references: referenceString,
      reference: -1,
      hit: false,
      faulted: false,
      frameNumber: null,
      victimPage: null,
      victimFrame: null,
      evicted: false,
      frames,
      frameCount,
      hits: state.hits,
      faults: state.faults,
      replacements: state.replacements,
      hitRate: total === 0 ? 0 : state.hits / Math.max(1, state.hits + state.faults),
      faultRate: total === 0 ? 0 : state.faults / Math.max(1, state.hits + state.faults),
      reason: '',
      summary: `${algorithmLabel} with ${frameCount} frame${frameCount === 1 ? '' : 's'}. ${summary}`,
    };
  };

  const drafts: StepDraft<PageReplacementStepData>[] = [];

  const emit = (
    event: ReplacementEvent,
    label: string,
    description: string,
    explanation: string,
    detail: Partial<PageReplacementStepData> = {},
  ): void => {
    const base = snapshot(event, label);
    const data: PageReplacementStepData = { ...base, ...detail };
    drafts.push({
      label,
      description,
      explanation,
      clock: drafts.length,
      data,
      highlights: [],
      metrics: pageReplacementStepMetrics(data),
    });
  };

  /* --------------------------------------------------------------------- init */
  const resident = state.slots.filter((slot) => slot.page !== null).length;
  emit(
    'init',
    `Empty frames — ${algorithmLabel}`,
    `All ${frameCount} frame${frameCount === 1 ? ' is' : 's are'} empty; ${resident} resident.`,
    `${algorithmLabel} starts with ${frameCount} free frame${frameCount === 1 ? '' : 's'}, so the first ${Math.min(
      frameCount,
      Math.max(1, new Set(referenceString).size),
    )} distinct page${frameCount === 1 ? '' : 's'} will fault in without any eviction. ${
      algorithm === 'fifo'
        ? 'FIFO evicts the page that has been resident the longest, ignoring how often it is used.'
        : algorithm === 'lru'
          ? 'LRU evicts the page that has gone unused the longest, using recent history as a predictor of the future.'
          : algorithm === 'optimal'
            ? 'OPT evicts the page whose next use lies furthest in the future — it needs the whole string up front, so it is a measuring stick rather than an implementable policy.'
            : 'Second Chance keeps a reference bit per frame; the clock hand sweeps forward clearing bits, and the first frame whose bit is still clear is the victim.'
    }`,
  );

  /* ------------------------------------------------------------- references */
  referenceString.forEach((page, index) => {
    const residentIndex = state.slots.findIndex((slot) => slot.page === page);

    if (residentIndex >= 0) {
      // Hit: refresh recency, and set the clock's reference bit.
      state.hits += 1;
      const slot = state.slots[residentIndex]!;
      slot.recency = index;
      if (algorithm === 'clock') slot.referenced = true;
      const explanation =
        algorithm === 'fifo'
          ? 'FIFO ignores how often a page is used, so a hit changes nothing about the eviction order — the page keeps its original load position in the queue.'
          : algorithm === 'lru'
            ? 'LRU treats the page as the most recently used, so it is the last candidate for eviction from now on.'
            : algorithm === 'optimal'
              ? 'OPT is a reference policy: a hit leaves the frame set untouched, and the next eviction still consults the future.'
              : 'The clock sets the page’s reference bit, giving it a second chance: the hand will skip over it the next time it sweeps past.';
      emit(
        'hit',
        `Hit — page ${page}`,
        `Page ${page} is already in frame ${residentIndex}.`,
        explanation,
        {
          referenceIndex: index,
          reference: page,
          hit: true,
          frameNumber: residentIndex,
          frames: state.slots.map((item, frame) => ({
            frame,
            page: item.page,
            referenced: algorithm === 'clock' ? item.referenced : false,
            recency: item.recency,
            loadedAt: item.loadedAt,
            active: frame === residentIndex,
            victim: false,
            hand: algorithm === 'clock' && frame === state.hand,
          })),
          reason: `Page ${page} is resident, so this reference is a hit — no replacement takes place.`,
          summary: `Hit on page ${page} in frame ${residentIndex}; ${state.hits} hit${state.hits === 1 ? '' : 's'}, ${state.faults} fault${state.faults === 1 ? '' : 's'} so far.`,
        },
      );
      return;
    }

    state.faults += 1;

    const freeFrame = state.slots.findIndex((slot) => slot.page === null);
    if (freeFrame >= 0) {
      state.slots[freeFrame] = { page, referenced: true, recency: index, loadedAt: index };
      const frames = state.slots.map((item, frame) => ({
        frame,
        page: item.page,
        referenced: algorithm === 'clock' ? item.referenced : false,
        recency: item.recency,
        loadedAt: item.loadedAt,
        active: frame === freeFrame,
        victim: false,
        hand: algorithm === 'clock' && frame === state.hand,
      }));
      emit(
        'fault',
        `Fault — page ${page} → frame ${freeFrame}`,
        `Page ${page} is not resident; frame ${freeFrame} is free, so it is loaded with no eviction.`,
        'A page fault means the page’s valid bit was clear. Because a frame is still free, the operating system simply reads the page in and sets its valid bit — no victim has to be chosen yet. Once every frame is occupied, the next fault must evict.',
        {
          referenceIndex: index,
          reference: page,
          faulted: true,
          frameNumber: freeFrame,
          frames,
          reason: `Frame ${freeFrame} is free, so page ${page} is loaded without evicting anything.`,
          summary: `Fault on page ${page}; loaded into the free frame ${freeFrame}.`,
        },
      );
      return;
    }

    /* ------------------------------------------------------- choose a victim */
    let victimFrame = -1;
    let reason = '';
    let sweeps = 0;

    if (algorithm === 'fifo') {
      victimFrame = firstMinimum(state.slots, (slot) => slot.loadedAt);
      const victim = state.slots[victimFrame]!;
      reason = `Page ${victim.page} has been resident the longest — it was loaded at reference ${
        victim.loadedAt + 1
      } — so FIFO evicts it. FIFO ignores how often a page is used, which is exactly why it can suffer Bélády's anomaly.`;
    } else if (algorithm === 'lru') {
      victimFrame = firstMinimum(state.slots, (slot) => slot.recency);
      const victim = state.slots[victimFrame]!;
      reason = `Page ${victim.page} was used least recently — its last use was reference ${
        victim.recency + 1
      } — so LRU evicts it. LRU uses the recent past as a predictor of the near future.`;
    } else if (algorithm === 'optimal') {
      let best = -1;
      victimFrame = -1;
      for (let frame = 0; frame < state.slots.length; frame += 1) {
        const slot = state.slots[frame]!;
        if (slot.page === null) continue;
        const use = nextUse(referenceString, index, slot.page);
        if (use > best) {
          best = use;
          victimFrame = frame;
        }
      }
      const victim = state.slots[victimFrame]!;
      reason = Number.isFinite(best)
        ? `Page ${victim.page}'s next use is at reference ${best + 1}, later than any other resident page, so OPT evicts it. OPT needs the whole reference string up front, which is why it is a theoretical lower bound rather than a real policy.`
        : `Page ${victim.page} is never referenced again, so OPT evicts it first — a page with no future use is the ideal victim.`;
    } else {
      // Second Chance / Clock: sweep the hand, clearing reference bits, until a
      // frame with a clear bit is found.
      let guard = 0;
      while (state.slots[state.hand]!.referenced && guard <= state.slots.length) {
        state.slots[state.hand]!.referenced = false;
        state.hand = (state.hand + 1) % state.slots.length;
        sweeps += 1;
        guard += 1;
      }
      victimFrame = state.hand;
      const victim = state.slots[victimFrame]!;
      state.hand = (state.hand + 1) % state.slots.length;
      reason =
        sweeps > 0
          ? `The clock hand cleared ${sweeps} reference bit${sweeps === 1 ? '' : 's'} before reaching frame ${victimFrame}: page ${victim.page} had no second chance left, so it is replaced. This is LRU approximated in hardware without tracking a full recency order.`
          : `The clock hand points at frame ${victimFrame}, whose page ${victim.page} has a clear reference bit, so it is replaced immediately. The new page gets the benefit of the doubt: its reference bit is set to 1.`;
    }

    const victimPage = state.slots[victimFrame]!.page;
    state.replacements += 1;
    state.slots[victimFrame] = { page, referenced: true, recency: index, loadedAt: index };

    const frames: FrameSlotView[] = state.slots.map((item, frame) => ({
      frame,
      page: item.page,
      referenced: algorithm === 'clock' ? item.referenced : false,
      recency: item.recency,
      loadedAt: item.loadedAt,
      active: frame === victimFrame,
      victim: frame === victimFrame,
      hand: algorithm === 'clock' && frame === state.hand,
    }));

    emit(
      'replace',
      `Fault — page ${page} replaces page ${victimPage} in frame ${victimFrame}`,
      `No frame is free, so ${algorithmLabel} evicts page ${victimPage} and loads page ${page} into frame ${victimFrame}.`,
      `${reason} The eviction is the whole point of a replacement policy: the choice of victim is what separates FIFO, LRU, Clock and OPT, and it is what decides the fault rate.`,
      {
        referenceIndex: index,
        reference: page,
        faulted: true,
        evicted: true,
        frameNumber: victimFrame,
        victimPage,
        victimFrame,
        frames,
        reason,
        summary: `Fault on page ${page}; ${algorithmLabel} replaced page ${victimPage} in frame ${victimFrame}.`,
      },
    );
  });

  const steps = createSteps(drafts);
  const last = steps[steps.length - 1];
  const finalData = (last?.data ?? snapshot('init', '')) as PageReplacementStepData;

  return {
    algorithmId,
    labId: PAGE_REPLACEMENT_LAB_ID,
    input: {
      algorithm,
      frameCount,
      references: referenceString.length,
      steps: steps.length,
    },
    steps,
    state: createSimulationState<PageReplacementStepData>({
      labId: PAGE_REPLACEMENT_LAB_ID,
      algorithmId,
      steps,
      parameters: { algorithm, frameCount },
      speed: config.speed,
    }),
    summary: {
      references: referenceString.length,
      frames: frameCount,
      hits: finalData.hits,
      faults: finalData.faults,
      replacements: finalData.replacements,
      hitRate: finalData.hitRate,
      faultRate: finalData.faultRate,
      steps: steps.length,
    },
  };
}

export const pageReplacementEngine: SimulationEngine<PageReplacementInput, PageReplacementStepData> = {
  id: PAGE_REPLACEMENT_ENGINE_ID,
  algorithmId: PAGE_REPLACEMENT_ALGORITHM_ID,
  labId: PAGE_REPLACEMENT_LAB_ID,
  name: 'Page Replacement',
  description:
    'Replay a reference string over a fixed frame set under FIFO, Optimal, LRU or Second Chance (Clock), showing each hit, fault and eviction.',
  validate: validatePageReplacementInput,
  run: runPageReplacement,
};
