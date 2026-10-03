import { describe, expect, it } from 'vitest';
import {
  CONTIGUOUS_PRESETS,
  FIXED_PARTITION_PRESETS,
  allocateBlock,
  buildMemoryChallenges,
  coalesce,
  compactBlocks,
  computeMemoryMetrics,
  createFixedLayout,
  createVariableLayout,
  deallocateBlock,
  findFit,
  runMemory,
  validateMemoryInput,
  type Block,
  type MemoryInput,
  type MemoryStepData,
  type SimulationRun,
} from '@/engine';

function block(
  start: number,
  size: number,
  state: Block['state'] = 'free',
  process: string | null = null,
  processSize = 0,
): Block {
  return { start, size, state, process, processSize };
}

function data(run: SimulationRun<MemoryStepData>): MemoryStepData {
  const last = run.steps[run.steps.length - 1];
  if (!last) throw new Error('empty run');
  return last.data;
}

function variablePreset(id: string): MemoryInput {
  const preset = CONTIGUOUS_PRESETS.find((item) => item.id === id);
  if (!preset) throw new Error(`missing preset ${id}`);
  return {
    mode: 'variable',
    policy: 'first-fit',
    totalSize: preset.totalSize,
    operations: preset.operations,
  };
}

/* -------------------------------------------------------------------------- */
/* Pure block helpers                                                         */
/* -------------------------------------------------------------------------- */

describe('fit policies', () => {
  const layout: Block[] = [
    block(0, 100),
    block(100, 50, 'allocated', 'A', 50),
    block(150, 300),
    block(450, 50, 'allocated', 'B', 50),
    block(500, 200),
  ];

  it('first fit takes the earliest fitting hole', () => {
    expect(findFit(layout, 150, 'first-fit', 0)).toBe(2);
  });

  it('best fit takes the smallest fitting hole', () => {
    expect(findFit(layout, 150, 'best-fit', 0)).toBe(4);
  });

  it('worst fit takes the largest hole', () => {
    expect(findFit(layout, 150, 'worst-fit', 0)).toBe(2);
  });

  it('next fit resumes from the roving pointer and wraps', () => {
    expect(findFit(layout, 150, 'next-fit', 0)).toBe(2);
    expect(findFit(layout, 150, 'next-fit', 300)).toBe(4);
    // Past every hole, so it wraps back to the first fitting one.
    expect(findFit(layout, 150, 'next-fit', 900)).toBe(2);
  });

  it('returns -1 when nothing fits', () => {
    expect(findFit(layout, 350, 'best-fit', 0)).toBe(-1);
    expect(findFit(layout, 1000, 'first-fit', 0)).toBe(-1);
  });
});

describe('variable allocation', () => {
  it('splits a hole and leaves the remainder', () => {
    const result = allocateBlock([block(0, 500)], 'A', 200, 'first-fit', 0, 'variable');
    expect(result).not.toBeNull();
    expect(result?.blocks).toEqual([block(0, 200, 'allocated', 'A', 200), block(200, 300)]);
    expect(result?.nextPointer).toBe(200);
  });

  it('handles an exact fit without leaving a zero-size hole', () => {
    const result = allocateBlock([block(0, 200)], 'A', 200, 'first-fit', 0, 'variable');
    expect(result?.blocks).toEqual([block(0, 200, 'allocated', 'A', 200)]);
  });

  it('fails when no hole is large enough even if total free memory is', () => {
    const layout = [block(0, 200), block(300, 200)];
    expect(allocateBlock(layout, 'A', 350, 'first-fit', 0, 'variable')).toBeNull();
    expect(computeMemoryMetrics(layout, 'variable').freeBytes).toBe(400);
  });

  it('picks among multiple holes per policy', () => {
    const layout = [block(0, 200), block(300, 400), block(800, 300)];
    const first = allocateBlock(layout, 'A', 250, 'first-fit', 0, 'variable');
    const best = allocateBlock(layout, 'A', 250, 'best-fit', 0, 'variable');
    const worst = allocateBlock(layout, 'A', 250, 'worst-fit', 0, 'variable');
    // Only the 400 and 300 holes fit; first/worst take the 400, best takes the 300.
    expect(first?.blocks[1]).toEqual(block(300, 250, 'allocated', 'A', 250));
    expect(worst?.blocks[1]).toEqual(block(300, 250, 'allocated', 'A', 250));
    expect(best?.blocks[2]).toEqual(block(800, 250, 'allocated', 'A', 250));
  });
});

describe('deallocation and coalescing', () => {
  it('frees a block and merges both neighbours', () => {
    const layout = [block(0, 100), block(100, 200, 'allocated', 'A', 200), block(300, 100)];
    const result = deallocateBlock(layout, 'A', 'variable');
    expect(result?.blocks).toEqual([block(0, 400)]);
  });

  it('coalesce merges only adjacent free blocks', () => {
    const merged = coalesce([block(0, 100), block(100, 100), block(400, 100)]);
    expect(merged).toEqual([block(0, 200), block(400, 100)]);
  });

  it('returns null for a process that is not resident', () => {
    expect(deallocateBlock([block(0, 100)], 'ghost', 'variable')).toBeNull();
  });

  it('does not merge fixed partitions', () => {
    const layout = createFixedLayout([200, 300]);
    expect(layout).toEqual([block(0, 200), block(200, 300)]);
    const result = deallocateBlock(
      [block(0, 200, 'allocated', 'A', 150), block(200, 300)],
      'A',
      'fixed',
    );
    expect(result?.blocks).toEqual([block(0, 200), block(200, 300)]);
  });
});

describe('compaction', () => {
  it('slides allocations to the low end and merges free memory', () => {
    const layout = [
      block(0, 100),
      block(100, 200, 'allocated', 'A', 200),
      block(300, 100),
      block(400, 200, 'allocated', 'B', 200),
      block(600, 200),
    ];
    const compacted = compactBlocks(layout);
    expect(compacted).toEqual([
      block(0, 200, 'allocated', 'A', 200),
      block(200, 200, 'allocated', 'B', 200),
      block(400, 400),
    ]);
  });

  it('leaves a single free block when nothing is allocated', () => {
    expect(compactBlocks([block(0, 500)])).toEqual([block(0, 500)]);
  });
});

describe('metrics', () => {
  it('reports internal fragmentation only for fixed partitions', () => {
    const fixed = createFixedLayout([200, 300]);
    fixed[0] = block(0, 200, 'allocated', 'A', 150);
    expect(computeMemoryMetrics(fixed, 'fixed').internalFragmentation).toBe(50);
    expect(computeMemoryMetrics(fixed, 'fixed').externalFragmentation).toBe(0);
  });

  it('reports external fragmentation as free bytes not in the largest hole', () => {
    const layout = [block(0, 100), block(200, 300)];
    const metrics = computeMemoryMetrics(layout, 'variable');
    expect(metrics.freeBytes).toBe(400);
    expect(metrics.largestFreeBlock).toBe(300);
    expect(metrics.externalFragmentation).toBe(100);
    expect(metrics.freeBlocks).toBe(2);
  });

  it('starts variable memory as one free block', () => {
    expect(createVariableLayout(1000)).toEqual([block(0, 1000)]);
    expect(createVariableLayout(1000).length).toBe(1);
  });
});

/* -------------------------------------------------------------------------- */
/* Engine runs                                                                */
/* -------------------------------------------------------------------------- */

describe('memory engine', () => {
  it('runs a simple sequence', () => {
    const run = runMemory(variablePreset('mem-basic'));
    const final = data(run);
    expect(final.resident).toEqual(['A', 'E', 'C', 'D']);
    expect(final.freeBlocks).toBe(2);
    expect(final.freeBytes).toBe(150);
  });

  it('places the same request differently under first, best and worst fit', () => {
    const preset = variablePreset('mem-strategies');
    const startFor = (policy: MemoryInput['policy']): number => {
      const final = data(runMemory({ ...preset, policy }));
      return final.activeStart ?? -1;
    };
    expect(startFor('first-fit')).toBe(0);
    expect(startFor('best-fit')).toBe(1000);
    expect(startFor('worst-fit')).toBe(450);
  });

  it('fails a fragmented request, then succeeds after compaction', () => {
    const run = runMemory(variablePreset('mem-fragmentation'));
    const failed = run.steps.find((step) => step.label === 'E could not be allocated');
    expect(failed?.data.success).toBe(false);
    const compact = run.steps.find((step) => step.label === 'Compact memory');
    expect(compact?.data.compactions).toBe(1);
    const final = data(run);
    expect(final.success).toBe(true);
    // X and Y slide to the low end, leaving one 900-unit hole at address 300.
    expect(final.activeStart).toBe(300);
    expect(final.freeBlocks).toBe(1);
  });

  it('totals internal fragmentation across fixed partitions', () => {
    const preset = FIXED_PARTITION_PRESETS.find((item) => item.id === 'fixed-internal')!;
    const run = runMemory({
      mode: 'fixed',
      policy: 'first-fit',
      totalSize: preset.totalSize,
      partitions: preset.partitions,
      operations: preset.operations,
    });
    const final = data(run);
    expect(final.internalFragmentation).toBe(200);
    expect(final.allocatedBytes).toBe(1000);
    expect(final.freeBytes).toBe(0);
  });

  it('keeps a fixed partition at its reserved size after a release', () => {
    const run = runMemory({
      mode: 'fixed',
      policy: 'first-fit',
      totalSize: 1000,
      partitions: [200, 300, 500],
      operations: [
        { kind: 'allocate', name: 'A', size: 150 },
        { kind: 'deallocate', name: 'A' },
      ],
    });
    const final = data(run);
    expect(final.blocks[0]).toMatchObject({ start: 0, size: 200, state: 'free' });
    expect(final.freeBlocks).toBe(3);
  });

  it('makes compaction a no-op with fixed partitions', () => {
    const run = runMemory({
      mode: 'fixed',
      policy: 'first-fit',
      totalSize: 500,
      partitions: [250, 250],
      operations: [
        { kind: 'allocate', name: 'A', size: 100 },
        { kind: 'compact' },
      ],
    });
    const compact = run.steps.find((step) => step.label === 'Compaction has no effect');
    expect(compact).toBeDefined();
    expect(data(run).compactions).toBe(0);
    expect(data(run).blocks[0]?.start).toBe(0);
  });

  it('records an unknown deallocation without changing the map', () => {
    const run = runMemory({
      mode: 'variable',
      policy: 'first-fit',
      totalSize: 500,
      operations: [{ kind: 'deallocate', name: 'ghost' }],
    });
    expect(data(run).freeBlocks).toBe(1);
    expect(run.steps.some((step) => step.label === 'ghost is not resident')).toBe(true);
  });

  it('reports the allocation id and lab for each mode', () => {
    expect(runMemory({ ...variablePreset('mem-basic'), policy: 'next-fit' }).algorithmId).toBe('next-fit');
    expect(
      runMemory({
        mode: 'fixed',
        policy: 'best-fit',
        totalSize: 400,
        partitions: [200, 200],
        operations: [],
      }).algorithmId,
    ).toBe('fixed-partitions');
    expect(
      runMemory({
        mode: 'fixed',
        policy: 'best-fit',
        totalSize: 400,
        partitions: [200, 200],
        operations: [],
      }).labId,
    ).toBe('lab-fixed-partitions');
  });

  it('is deterministic', () => {
    const first = runMemory({ ...variablePreset('mem-strategies'), policy: 'worst-fit' });
    const second = runMemory({ ...variablePreset('mem-strategies'), policy: 'worst-fit' });
    expect(second.steps.map((step) => step.id)).toEqual(first.steps.map((step) => step.id));
    expect(second.summary).toEqual(first.summary);
  });

  it('validates its input', () => {
    const base: MemoryInput = { mode: 'variable', policy: 'first-fit', totalSize: 1000, operations: [] };
    expect(validateMemoryInput(base)).toEqual({ valid: true });
    expect(
      validateMemoryInput({ ...base, operations: [{ kind: 'allocate', name: 'A', size: 0 }] }).valid,
    ).toBe(false);
    expect(
      validateMemoryInput({ ...base, operations: [{ kind: 'allocate', name: '  ', size: 100 }] }).valid,
    ).toBe(false);
    expect(validateMemoryInput({ ...base, totalSize: 10 }).valid).toBe(false);
    expect(
      validateMemoryInput({
        mode: 'fixed',
        policy: 'first-fit',
        totalSize: 1000,
        partitions: [200, 300],
        operations: [],
      }).valid,
    ).toBe(false);
    expect(
      validateMemoryInput({
        mode: 'fixed',
        policy: 'first-fit',
        totalSize: 500,
        partitions: [200, 300],
        operations: [],
      }).valid,
    ).toBe(true);
    expect(() => runMemory({ ...base, totalSize: 10 })).toThrow(/invalid input/i);
  });

  it('runs every preset without error', () => {
    for (const preset of CONTIGUOUS_PRESETS) {
      expect(runMemory(variablePreset(preset.id)).steps.length).toBeGreaterThan(1);
    }
    for (const preset of FIXED_PARTITION_PRESETS) {
      const run = runMemory({
        mode: 'fixed',
        policy: 'first-fit',
        totalSize: preset.totalSize,
        partitions: preset.partitions,
        operations: preset.operations,
      });
      expect(run.steps.length).toBeGreaterThan(1);
    }
  });
});

describe('memory challenges', () => {
  it('produces well-formed, deterministic questions', () => {
    const challenges = buildMemoryChallenges();
    expect(challenges.length).toBeGreaterThanOrEqual(10);
    for (const challenge of challenges) {
      expect(challenge.correctIndex).toBeGreaterThanOrEqual(0);
      expect(challenge.correctIndex).toBeLessThan(challenge.options.length);
      expect(new Set(challenge.options).size).toBe(challenge.options.length);
    }
    expect(buildMemoryChallenges().map((c) => c.correctIndex)).toEqual(
      challenges.map((c) => c.correctIndex),
    );
  });

  it('answers the internal-fragmentation question correctly', () => {
    const challenge = buildMemoryChallenges().find((item) => item.id === 'memory-internal-fragmentation');
    expect(challenge?.options[challenge.correctIndex]).toBe('200');
  });

  it('answers the fragmented-failure question correctly', () => {
    const challenge = buildMemoryChallenges().find((item) => item.id === 'memory-fragmentation-fails');
    expect(challenge?.options[challenge.correctIndex]).toBe('No');
  });
});
