import { describe, expect, it } from 'vitest';
import { queryNumber } from '@/hooks';

describe('queryNumber', () => {
  it('parses a numeric value', () => {
    expect(queryNumber({ quantum: '2' }, 'quantum')).toBe(2);
    expect(queryNumber({ quantum: '0.5' }, 'quantum')).toBe(0.5);
  });

  it('returns undefined for a missing key', () => {
    expect(queryNumber({}, 'quantum')).toBeUndefined();
  });

  it('treats an empty value as absent rather than zero', () => {
    expect(queryNumber({ quantum: '' }, 'quantum')).toBeUndefined();
    expect(queryNumber({ quantum: '   ' }, 'quantum')).toBeUndefined();
  });

  it('ignores malformed values', () => {
    expect(queryNumber({ quantum: 'lots' }, 'quantum')).toBeUndefined();
    expect(queryNumber({ quantum: 'Infinity' }, 'quantum')).toBeUndefined();
  });
});
