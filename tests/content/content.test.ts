import { describe, expect, it } from 'vitest';
import {
  ALGORITHMS,
  ALL_EXAMPLES,
  LABS,
  TOPICS,
  getAlgorithm,
  getAlgorithms,
  getContentStats,
  getDependents,
  getExamplesForLab,
  getLab,
  getLabsForTopic,
  getTopic,
  getTopicForLab,
  searchContent,
} from '@/content';
import { DIFFICULTY_ORDER, type TopicId } from '@/types';

const EXPECTED_TOPICS: readonly TopicId[] = [
  'process-management',
  'cpu-scheduling',
  'synchronization',
  'deadlocks',
  'memory-management',
  'virtual-memory',
  'disk-scheduling',
  'file-systems',
];

describe('topics', () => {
  it('covers all eight learning areas', () => {
    expect(TOPICS.map((topic) => topic.id)).toEqual(EXPECTED_TOPICS);
  });

  it('gives every topic valid metadata', () => {
    for (const topic of TOPICS) {
      expect(topic.title.length).toBeGreaterThan(0);
      expect(topic.tagline.length).toBeGreaterThan(0);
      expect(topic.description.length).toBeGreaterThan(20);
      expect(topic.glyph.length).toBeGreaterThan(0);
      expect(topic.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(DIFFICULTY_ORDER).toContain(topic.difficulty);
      expect(topic.estimatedMinutes).toBeGreaterThan(0);
      expect(topic.objectives.length).toBeGreaterThanOrEqual(3);
      expect(topic.labs.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate topic ids', () => {
    const ids = TOPICS.map((topic) => topic.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only references prerequisites that exist', () => {
    const ids = new Set<TopicId>(TOPICS.map((topic) => topic.id));
    for (const topic of TOPICS) {
      for (const prerequisite of topic.prerequisites) {
        expect(ids.has(prerequisite)).toBe(true);
        expect(prerequisite).not.toBe(topic.id);
      }
    }
  });

  it('attaches each lab to its own topic', () => {
    for (const topic of TOPICS) {
      for (const lab of topic.labs) {
        expect(lab.topicId).toBe(topic.id);
      }
    }
  });
});

describe('labs', () => {
  it('has unique ids and non-empty copy', () => {
    const ids = LABS.map((lab) => lab.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const lab of LABS) {
      expect(lab.objectives.length).toBeGreaterThanOrEqual(3);
      expect(lab.algorithmIds.length).toBeGreaterThan(0);
      expect(lab.estimatedMinutes).toBeGreaterThan(0);
    }
  });

  it('points every lab at a real topic', () => {
    for (const lab of LABS) {
      expect(getTopic(lab.topicId)).toBeDefined();
    }
  });

  it('only references algorithms that exist in the catalogue', () => {
    for (const lab of LABS) {
      for (const algorithmId of lab.algorithmIds) {
        expect(getAlgorithm(algorithmId), `missing algorithm "${algorithmId}"`).toBeDefined();
      }
    }
  });

  it('marks at least one lab as available so the app ships a working simulator', () => {
    expect(LABS.some((lab) => lab.status === 'available')).toBe(true);
  });
});

describe('algorithms', () => {
  it('has unique ids', () => {
    const ids = ALGORITHMS.map((algorithm) => algorithm.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('belongs to a known topic', () => {
    for (const algorithm of ALGORITHMS) {
      expect(getTopic(algorithm.topicId)).toBeDefined();
    }
  });

  it('defaults every declared parameter to a matching type', () => {
    for (const algorithm of ALGORITHMS) {
      for (const parameter of algorithm.parameters) {
        const value = parameter.defaultValue;
        if (parameter.kind === 'number') expect(typeof value).toBe('number');
        if (parameter.kind === 'boolean') expect(typeof value).toBe('boolean');
        if (parameter.kind === 'select') expect(typeof value).toBe('string');
      }
    }
  });
});

describe('examples', () => {
  it('attaches examples only to existing labs', () => {
    for (const example of ALL_EXAMPLES) {
      expect(getLab(example.labId), `missing lab "${example.labId}"`).toBeDefined();
    }
  });

  it('gives every example a scenario and an expected outcome', () => {
    expect(ALL_EXAMPLES.length).toBeGreaterThan(0);
    for (const example of ALL_EXAMPLES) {
      expect(example.scenario.length).toBeGreaterThan(20);
      expect(example.expectedOutcome.length).toBeGreaterThan(10);
      expect(example.discussion.length).toBeGreaterThan(0);
    }
  });

  it('provides loadable input for every interactive lab example', () => {
    for (const example of ALL_EXAMPLES) {
      const lab = getLab(example.labId);
      if (lab?.status === 'available') {
        expect(example.input, `example "${example.id}" needs an input`).toBeDefined();
      }
    }
  });

  it('resolves examples by lab id', () => {
    expect(getExamplesForLab('lab-fcfs').length).toBeGreaterThan(0);
    expect(getExamplesForLab('lab-fcfs')[0]?.labId).toBe('lab-fcfs');
    expect(getExamplesForLab('nope')).toEqual([]);
  });
});

describe('lookups', () => {
  it('resolves topics, labs and algorithms', () => {
    expect(getTopic('cpu-scheduling')?.title).toBe('CPU Scheduling');
    expect(getTopic('nope')).toBeUndefined();
    expect(getLab('lab-fcfs')?.topicId).toBe('cpu-scheduling');
    expect(getLab('nope')).toBeUndefined();
    expect(getAlgorithm('fcfs')?.abbreviation).toBe('FCFS');
  });

  it('resolves the topic that owns a lab', () => {
    expect(getTopicForLab('lab-fcfs')?.id).toBe('cpu-scheduling');
    expect(getTopicForLab('nope')).toBeUndefined();
  });

  it('filters out unknown algorithm ids instead of returning holes', () => {
    expect(getAlgorithms(['fcfs', 'does-not-exist']).map((item) => item.id)).toEqual(['fcfs']);
  });

  it('lists labs per topic', () => {
    expect(getLabsForTopic('cpu-scheduling').length).toBeGreaterThan(0);
    expect(getLabsForTopic('nope')).toEqual([]);
  });
});

describe('aggregates', () => {
  it('counts the catalogue consistently', () => {
    const stats = getContentStats();
    expect(stats.topicCount).toBe(EXPECTED_TOPICS.length);
    expect(stats.labCount).toBe(LABS.length);
    expect(stats.algorithmCount).toBe(ALGORITHMS.length);
    expect(stats.exampleCount).toBe(ALL_EXAMPLES.length);
    expect(stats.totalMinutes).toBeGreaterThan(0);
  });

  it('finds dependents of a topic', () => {
    const dependents = getDependents('synchronization');
    expect(dependents.map((topic) => topic.id)).toContain('deadlocks');
  });
});

describe('searchContent', () => {
  it('finds topics by title', () => {
    expect(searchContent('virtual').topics.map((topic) => topic.id)).toEqual(['virtual-memory']);
  });

  it('finds labs by summary and keyword', () => {
    expect(searchContent('gantt').labs.map((lab) => lab.id)).toContain('lab-fcfs');
  });

  it('finds algorithms by abbreviation', () => {
    expect(searchContent('rr').algorithms.map((algorithm) => algorithm.id)).toContain('round-robin');
  });

  it('returns everything for an empty query', () => {
    const result = searchContent('   ');
    expect(result.topics).toHaveLength(TOPICS.length);
    expect(result.labs).toHaveLength(LABS.length);
    expect(result.algorithms).toHaveLength(ALGORITHMS.length);
  });
});
