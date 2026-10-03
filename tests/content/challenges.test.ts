import { describe, expect, it } from 'vitest';
import {
  CHALLENGES,
  CHALLENGES_BY_ID,
  TOPICS,
  getChallenge,
  getChallengesForTopic,
  getLab,
  getRunnableChallenges,
  getTopic,
} from '@/content';

describe('challenges', () => {
  it('has unique ids', () => {
    const ids = CHALLENGES.map((challenge) => challenge.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('indexes every challenge in CHALLENGES_BY_ID', () => {
    for (const challenge of CHALLENGES) {
      expect(CHALLENGES_BY_ID.get(challenge.id)).toBe(challenge);
    }
    expect(CHALLENGES_BY_ID.size).toBe(CHALLENGES.length);
  });

  it('points every challenge at a real topic', () => {
    for (const challenge of CHALLENGES) {
      expect(getTopic(challenge.topicId), `missing topic "${challenge.topicId}"`).toBeDefined();
    }
  });

  it('only links challenges to labs that exist', () => {
    for (const challenge of CHALLENGES) {
      if (challenge.labId === undefined) continue;
      expect(getLab(challenge.labId), `missing lab "${challenge.labId}"`).toBeDefined();
    }
  });

  it('gives every challenge the evidence a correct answer needs', () => {
    for (const challenge of CHALLENGES) {
      expect(challenge.title.length).toBeGreaterThan(0);
      expect(challenge.prompt.length).toBeGreaterThan(20);
      expect(challenge.scenario.length).toBeGreaterThan(20);
      expect(challenge.expectedOutcome.length).toBeGreaterThan(10);
      expect(challenge.requirements.length).toBeGreaterThanOrEqual(2);
      expect(challenge.estimatedMinutes).toBeGreaterThan(0);
    }
  });

  it('covers every learning area at least once', () => {
    for (const topic of TOPICS) {
      expect(
        getChallengesForTopic(topic.id).length,
        `topic "${topic.id}" has no challenge`,
      ).toBeGreaterThan(0);
    }
  });

  it('resolves reachable challenges as runnable', () => {
    const runnable = getRunnableChallenges();
    expect(runnable.length).toBeGreaterThan(0);
    for (const challenge of runnable) {
      expect(challenge.labId).toBeDefined();
      const lab = challenge.labId ? getLab(challenge.labId) : undefined;
      expect(lab?.status === 'available' || lab?.status === 'beta').toBe(true);
    }
  });

  it('resolves a single challenge by id', () => {
    expect(getChallenge(CHALLENGES[0]?.id ?? '')).toBe(CHALLENGES[0]);
    expect(getChallenge('nope')).toBeUndefined();
  });
});
