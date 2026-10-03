import { describe, expect, it } from 'vitest';
import { LESSONS, LESSONS_BY_TOPIC, LESSON_STAGE_ORDER, TOPICS, getLab, getLesson, getTopic } from '@/content';
import { getChallengeBank } from '@/engine';

describe('guided lessons', () => {
  it('provides exactly one lesson per learning area', () => {
    expect(LESSONS.map((lesson) => lesson.topicId).sort()).toEqual(
      TOPICS.map((topic) => topic.id).sort(),
    );
  });

  it('has unique topic ids and a working lookup', () => {
    const ids = LESSONS.map((lesson) => lesson.topicId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const lesson of LESSONS) {
      expect(LESSONS_BY_TOPIC.get(lesson.topicId)).toBe(lesson);
      expect(getLesson(lesson.topicId)).toBe(lesson);
    }
    expect(getLesson('does-not-exist')).toBeUndefined();
  });

  it('follows the six-stage order in every lesson', () => {
    for (const lesson of LESSONS) {
      expect(lesson.stages.map((stage) => stage.kind)).toEqual([...LESSON_STAGE_ORDER]);
    }
  });

  it('gives every lesson objectives, key terms and common mistakes', () => {
    for (const lesson of LESSONS) {
      expect(lesson.objectives.length, `${lesson.topicId} objectives`).toBeGreaterThanOrEqual(3);
      expect(lesson.keyTerms.length, `${lesson.topicId} key terms`).toBeGreaterThanOrEqual(4);
      expect(lesson.commonMistakes.length, `${lesson.topicId} common mistakes`).toBeGreaterThanOrEqual(2);
      expect(lesson.estimatedMinutes).toBeGreaterThan(0);
      expect(lesson.title.length).toBeGreaterThan(3);
      expect(lesson.subtitle.length).toBeGreaterThan(10);
    }
  });

  it('only references prerequisites that exist', () => {
    for (const lesson of LESSONS) {
      for (const prerequisite of lesson.prerequisites) {
        expect(getTopic(prerequisite), `${lesson.topicId} → ${prerequisite}`).toBeDefined();
        expect(prerequisite).not.toBe(lesson.topicId);
      }
    }
  });

  it('resolves every lab referenced by a visualization or experiment stage', () => {
    for (const lesson of LESSONS) {
      const labs = lesson.stages
        .filter((stage) => stage.kind === 'visualization' || stage.kind === 'experiment')
        .map((stage) => stage.labId);
      expect(labs.length, `${lesson.topicId} has no lab stage`).toBeGreaterThan(0);
      for (const labId of labs) {
        expect(getLab(labId), `missing lab ${labId}`).toBeDefined();
      }
    }
  });

  it('points every challenge stage at real banks from the same learning area', () => {
    for (const lesson of LESSONS) {
      const challengeStage = lesson.stages.find((stage) => stage.kind === 'challenge');
      expect(challengeStage, `${lesson.topicId} has no challenge stage`).toBeDefined();
      if (!challengeStage || challengeStage.kind !== 'challenge') continue;
      expect(challengeStage.bankIds.length).toBeGreaterThan(0);
      for (const bankId of challengeStage.bankIds) {
        const bank = getChallengeBank(bankId);
        expect(bank, `missing challenge bank ${bankId}`).toBeDefined();
        expect(bank?.topic, `${bankId} belongs to ${bank?.topic}, not ${lesson.topicId}`).toBe(lesson.topicId);
      }
    }
  });

  it('gives every stage a title, a summary and positive time', () => {
    for (const lesson of LESSONS) {
      for (const stage of lesson.stages) {
        expect(stage.title.length, `${lesson.topicId}/${stage.kind} title`).toBeGreaterThan(2);
        expect(stage.summary.length, `${lesson.topicId}/${stage.kind} summary`).toBeGreaterThan(5);
        expect(stage.estimatedMinutes).toBeGreaterThan(0);
      }
    }
  });

  it('provides reflection prompts and walkthrough steps', () => {
    for (const lesson of LESSONS) {
      const walkthrough = lesson.stages.find((stage) => stage.kind === 'walkthrough');
      const reflection = lesson.stages.find((stage) => stage.kind === 'reflection');
      expect(walkthrough?.kind === 'walkthrough' && walkthrough.steps.length).toBeGreaterThanOrEqual(3);
      expect(reflection?.kind === 'reflection' && reflection.prompts.length).toBeGreaterThanOrEqual(2);
    }
  });
});
