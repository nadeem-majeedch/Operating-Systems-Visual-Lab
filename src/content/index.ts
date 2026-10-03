import type { Algorithm, Challenge, GuidedLesson, Lab, Topic, TopicId } from '@/types';
import { matchesQuery } from '@/utils';
import { ALGORITHMS, ALGORITHMS_BY_ID } from './algorithms';
import { CHALLENGES, CHALLENGES_BY_ID } from './challenges';
import { ALL_EXAMPLES, EXAMPLES_BY_LAB, type LabbedExample } from './examples';
import { LABS, LABS_BY_ID } from './labs';
import { LESSONS, LESSONS_BY_TOPIC, LESSON_STAGE_ORDER } from './lessons';
import { TOPICS, TOPICS_BY_ID } from './topics';

export {
  ALGORITHMS,
  ALGORITHMS_BY_ID,
  ALL_EXAMPLES,
  CHALLENGES,
  CHALLENGES_BY_ID,
  EXAMPLES_BY_LAB,
  LABS,
  LABS_BY_ID,
  LESSONS,
  LESSONS_BY_TOPIC,
  LESSON_STAGE_ORDER,
  TOPICS,
  TOPICS_BY_ID,
};
export type { LabbedExample } from './examples';

/* -------------------------------------------------------------------------- */
/* Lookups                                                                    */
/* -------------------------------------------------------------------------- */

export function getTopic(topicId: string): Topic | undefined {
  return TOPICS_BY_ID.get(topicId as TopicId);
}

export function getLab(labId: string): Lab | undefined {
  return LABS_BY_ID.get(labId);
}

export function getAlgorithm(algorithmId: string): Algorithm | undefined {
  return ALGORITHMS_BY_ID.get(algorithmId);
}

export function getAlgorithms(algorithmIds: readonly string[]): Algorithm[] {
  return algorithmIds
    .map((id) => ALGORITHMS_BY_ID.get(id))
    .filter((algorithm): algorithm is Algorithm => algorithm !== undefined);
}

export function getLabsForTopic(topicId: string): readonly Lab[] {
  return getTopic(topicId)?.labs ?? [];
}

export function getTopicForLab(labId: string): Topic | undefined {
  const lab = LABS_BY_ID.get(labId);
  return lab ? TOPICS_BY_ID.get(lab.topicId) : undefined;
}

/** Every algorithm that belongs to a learning area, in catalogue order. */
export function getAlgorithmsForTopic(topicId: string): readonly Algorithm[] {
  return ALGORITHMS.filter((algorithm) => algorithm.topicId === topicId);
}

/** The first lab that offers the given algorithm. */
export function getLabForAlgorithm(algorithmId: string): Lab | undefined {
  return LABS.find((lab) => lab.algorithmIds.includes(algorithmId));
}


export function getExamplesForLab(labId: string): readonly LabbedExample[] {
  return (EXAMPLES_BY_LAB[labId] ?? []).map((example) => ({ ...example, labId }));
}

export function getLesson(topicId: string): GuidedLesson | undefined {
  return LESSONS_BY_TOPIC.get(topicId);
}

export function getChallenge(challengeId: string): Challenge | undefined {
  return CHALLENGES_BY_ID.get(challengeId);
}

export function getChallengesForTopic(topicId: string): readonly Challenge[] {
  return CHALLENGES.filter((challenge) => challenge.topicId === topicId);
}

/** Challenges that can be attempted in a simulator that actually exists. */
export function getRunnableChallenges(): readonly Challenge[] {
  return CHALLENGES.filter((challenge) => {
    const lab = challenge.labId ? getLab(challenge.labId) : undefined;
    return lab?.status === 'available' || lab?.status === 'beta';
  });
}

/* -------------------------------------------------------------------------- */
/* Aggregates and search                                                      */
/* -------------------------------------------------------------------------- */

export interface ContentStats {
  readonly topicCount: number;
  readonly labCount: number;
  readonly availableLabCount: number;
  readonly algorithmCount: number;
  readonly exampleCount: number;
  readonly challengeCount: number;
  readonly totalMinutes: number;
}

export function getContentStats(): ContentStats {
  return {
    topicCount: TOPICS.length,
    labCount: LABS.length,
    availableLabCount: LABS.filter((lab) => lab.status === 'available').length,
    algorithmCount: ALGORITHMS.length,
    exampleCount: ALL_EXAMPLES.length,
    challengeCount: CHALLENGES.length,
    totalMinutes: TOPICS.reduce((total, topic) => total + topic.estimatedMinutes, 0),
  };
}

/** Case-insensitive search across topics, labs, algorithms and challenges. */
export function searchContent(query: string): {
  topics: Topic[];
  labs: Lab[];
  algorithms: Algorithm[];
  challenges: Challenge[];
} {
  return {
    topics: TOPICS.filter((topic) =>
      matchesQuery(query, [topic.title, topic.tagline, topic.description]),
    ),
    labs: LABS.filter((lab) =>
      matchesQuery(query, [lab.title, lab.summary, lab.description, lab.topicId]),
    ),
    algorithms: ALGORITHMS.filter((algorithm) =>
      matchesQuery(query, [
        algorithm.name,
        algorithm.abbreviation,
        algorithm.summary,
        algorithm.topicId,
      ]),
    ),
    challenges: CHALLENGES.filter((challenge) =>
      matchesQuery(query, [challenge.title, challenge.prompt, challenge.scenario]),
    ),
  };
}

/** Topics that list the given topic as a prerequisite. */
export function getDependents(topicId: TopicId): Topic[] {
  return TOPICS.filter((topic) => topic.prerequisites.includes(topicId));
}
