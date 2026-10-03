import { describe, expect, it } from 'vitest';
import {
  completedStageIds,
  isStageComplete,
  percentComplete,
  startedLessonCount,
  summariseProgress,
  withStage,
  withoutTopic,
} from '@/utils';

const STAGES = ['concept', 'visualization', 'experiment', 'walkthrough', 'challenge', 'reflection'];

describe('percentComplete', () => {
  it('rounds a fraction to a percentage', () => {
    expect(percentComplete(3, 6)).toBe(50);
    expect(percentComplete(1, 3)).toBe(33);
    expect(percentComplete(6, 6)).toBe(100);
  });

  it('is safe for empty or out-of-range counts', () => {
    expect(percentComplete(0, 0)).toBe(0);
    expect(percentComplete(9, 6)).toBe(100);
    expect(percentComplete(-3, 6)).toBe(0);
  });
});

describe('summariseProgress', () => {
  it('reports counts, percent and the next incomplete stage', () => {
    const summary = summariseProgress({ 'cpu-scheduling': ['concept', 'visualization'] }, 'cpu-scheduling', STAGES);
    expect(summary.completed).toBe(2);
    expect(summary.total).toBe(6);
    expect(summary.percent).toBe(33);
    expect(summary.isComplete).toBe(false);
    expect(summary.nextStageIndex).toBe(2);
  });

  it('reports completion when every stage is done', () => {
    const summary = summariseProgress({ 'cpu-scheduling': STAGES }, 'cpu-scheduling', STAGES);
    expect(summary.isComplete).toBe(true);
    expect(summary.nextStageIndex).toBeUndefined();
    expect(summary.percent).toBe(100);
  });

  it('ignores unknown stage ids', () => {
    const summary = summariseProgress({ x: ['concept', 'not-a-stage'] }, 'x', STAGES);
    expect(summary.completed).toBe(1);
    expect(summary.nextStageIndex).toBe(1);
  });

  it('handles an untouched lesson', () => {
    const summary = summariseProgress({}, 'file-systems', STAGES);
    expect(summary.completed).toBe(0);
    expect(summary.nextStageIndex).toBe(0);
  });
});

describe('withStage', () => {
  it('adds a stage without mutating the input', () => {
    const before = {};
    const after = withStage(before, 'deadlocks', 'concept', true);
    expect(before).toEqual({});
    expect(after['deadlocks']).toEqual(['concept']);
  });

  it('removes a stage when completed is false', () => {
    const after = withStage({ deadlocks: ['concept', 'visualization'] }, 'deadlocks', 'concept', false);
    expect(after['deadlocks']).toEqual(['visualization']);
  });

  it('does not duplicate an already-complete stage', () => {
    const after = withStage({ deadlocks: ['concept'] }, 'deadlocks', 'concept', true);
    expect(after['deadlocks']).toEqual(['concept']);
  });
});

describe('withoutTopic', () => {
  it('removes one lesson and keeps the rest', () => {
    const after = withoutTopic({ a: ['concept'], b: ['concept'] }, 'a');
    expect(after).toEqual({ b: ['concept'] });
  });
});

describe('selectors', () => {
  it('reads completed ids and stage completion', () => {
    const progress = { 'cpu-scheduling': ['concept'] };
    expect(completedStageIds(progress, 'cpu-scheduling')).toEqual(['concept']);
    expect(completedStageIds(progress, 'nope')).toEqual([]);
    expect(isStageComplete(progress, 'cpu-scheduling', 'concept')).toBe(true);
    expect(isStageComplete(progress, 'cpu-scheduling', 'reflection')).toBe(false);
  });

  it('counts started lessons', () => {
    expect(startedLessonCount({ a: ['concept'], b: [], c: ['concept', 'reflection'] })).toBe(2);
    expect(startedLessonCount({})).toBe(0);
  });
});
