import { describe, expect, it } from 'vitest';
import {
  DIFFICULTY_LABELS,
  STATUS_LABELS,
  formatDuration,
  formatNumber,
  formatPercent,
  formatTick,
  titleCase,
} from '@/utils';

describe('formatNumber', () => {
  it('trims trailing zeros', () => {
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber(12.5)).toBe('12.5');
    expect(formatNumber(12.345)).toBe('12.35');
  });

  it('renders non-finite values as a dash', () => {
    expect(formatNumber(Number.NaN)).toBe('—');
  });
});

describe('formatDuration', () => {
  it('formats seconds, minutes and both', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(1500)).toBe('25m');
  });

  it('treats non-positive input as zero', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(-10)).toBe('0s');
  });
});

describe('formatPercent', () => {
  it('converts a fraction to a percentage', () => {
    expect(formatPercent(0.8234)).toBe('82.3%');
    expect(formatPercent(1, 0)).toBe('100%');
  });
});

describe('titleCase', () => {
  it('turns slugs into readable labels', () => {
    expect(titleCase('round-robin')).toBe('Round Robin');
    expect(titleCase('fcfs')).toBe('Fcfs');
    expect(titleCase('  memory_management ')).toBe('Memory Management');
  });
});

describe('formatTick', () => {
  it('keeps integers clean and trims decimals', () => {
    expect(formatTick(4)).toBe('4');
    expect(formatTick(2.5)).toBe('2.5');
  });
});

describe('enum labels', () => {
  it('has a label for every difficulty level', () => {
    expect(DIFFICULTY_LABELS.beginner).toBe('Beginner');
    expect(DIFFICULTY_LABELS.intermediate).toBe('Intermediate');
    expect(DIFFICULTY_LABELS.advanced).toBe('Advanced');
  });

  it('has a label for every content status', () => {
    expect(STATUS_LABELS.planned).toBe('Planned');
    expect(STATUS_LABELS.beta).toBe('Beta');
    expect(STATUS_LABELS.available).toBe('Available');
  });
});
