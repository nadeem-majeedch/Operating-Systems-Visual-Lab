import { describe, expect, it } from 'vitest';
import {
  clamp,
  groupBy,
  matchesQuery,
  max,
  mean,
  min,
  range,
  round,
  sum,
  uniqueBy,
} from '@/utils';

describe('range', () => {
  it('produces a zero-based sequence', () => {
    expect(range(4)).toEqual([0, 1, 2, 3]);
  });

  it('honours start and step', () => {
    expect(range(3, 2, 2)).toEqual([2, 4, 6]);
  });

  it('never produces negative lengths', () => {
    expect(range(-5)).toEqual([]);
  });
});

describe('aggregates', () => {
  it('sums and averages', () => {
    expect(sum([1, 2, 3])).toBe(6);
    expect(mean([1, 2, 3])).toBe(2);
  });

  it('returns 0 for an empty list instead of NaN', () => {
    expect(sum([])).toBe(0);
    expect(mean([])).toBe(0);
    expect(min([])).toBe(0);
    expect(max([])).toBe(0);
  });

  it('finds extremes', () => {
    expect(min([4, -1, 9])).toBe(-1);
    expect(max([4, -1, 9])).toBe(9);
  });
});

describe('round', () => {
  it('rounds to the requested precision', () => {
    expect(round(3.14159, 2)).toBe(3.14);
    expect(round(2.5, 0)).toBe(3);
  });

  it('avoids binary floating point artefacts', () => {
    expect(round(0.1 + 0.2, 2)).toBe(0.3);
  });

  it('returns 0 for non-finite input', () => {
    expect(round(Number.NaN)).toBe(0);
    expect(round(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('clamp', () => {
  it('bounds values', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-5, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });

  it('rejects an inverted range', () => {
    expect(() => clamp(1, 5, 0)).toThrow(RangeError);
  });
});

describe('groupBy', () => {
  it('buckets items by key', () => {
    const grouped = groupBy(['a1', 'b1', 'a2'], (value) => value[0] ?? '');
    expect(grouped.a).toEqual(['a1', 'a2']);
    expect(grouped.b).toEqual(['b1']);
  });
});

describe('uniqueBy', () => {
  it('keeps the first occurrence in order', () => {
    const items = [
      { id: 1, label: 'first' },
      { id: 2, label: 'second' },
      { id: 1, label: 'duplicate' },
    ];
    expect(uniqueBy(items, (item) => item.id).map((item) => item.label)).toEqual([
      'first',
      'second',
    ]);
  });
});

describe('matchesQuery', () => {
  it('matches an empty query against everything', () => {
    expect(matchesQuery('', ['anything'])).toBe(true);
  });

  it('matches case-insensitively across fields', () => {
    expect(matchesQuery('SCHED', ['CPU scheduling', 'fcfs'])).toBe(true);
    expect(matchesQuery('memory', ['CPU scheduling', 'fcfs'])).toBe(false);
  });

  it('tolerates undefined fields', () => {
    expect(matchesQuery('fcfs', [undefined, 'FCFS'])).toBe(true);
  });
});
