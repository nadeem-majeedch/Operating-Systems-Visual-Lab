import { describe, expect, it } from 'vitest';
import {
  CHALLENGE_BANKS,
  CHALLENGE_KINDS,
  ENGINE_CHALLENGES,
  bankCounts,
  challengesForBank,
  challengesForTopic,
  filterChallenges,
  formatAnswer,
  getChallenge,
  getChallengeBank,
  gradeChallenge,
  listChallengeBanks,
  progressPercent,
  scoreSession,
  validateChallenge,
  validateChallengeBank,
} from '@/engine';
import type { ChallengeResponse, EngineChallenge } from '@/engine';
import { getLab } from '@/content';

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

function sampleChoice(overrides: Partial<EngineChallenge> = {}): EngineChallenge {
  return {
    id: 'sample-choice',
    topic: 'cpu-scheduling',
    bank: 'cpu-scheduling',
    difficulty: 'beginner',
    kind: 'multiple-choice',
    question: 'Which policy runs the earliest arrival first?',
    scenario: 'Three processes arrive at different times and the scheduler never preempts.',
    options: [
      { id: 'o0', label: 'First Come, First Served' },
      { id: 'o1', label: 'Round Robin' },
    ],
    expectedAnswer: { kind: 'choice', optionId: 'o0' },
    explanation: 'FCFS dispatches the head of the ready queue, which is the earliest arrival.',
    relatedLab: 'lab-fcfs',
    ...overrides,
  };
}

describe('validateChallenge', () => {
  it('accepts a well-formed choice challenge', () => {
    expect(validateChallenge(sampleChoice())).toEqual([]);
  });

  it('flags every missing required field', () => {
    const issues = validateChallenge({});
    const paths = issues.map((issue) => issue.path);
    for (const field of ['id', 'topic', 'bank', 'question', 'scenario', 'explanation', 'relatedLab']) {
      expect(paths).toContain(field);
    }
  });

  it('rejects an unknown difficulty', () => {
    const issues = validateChallenge(sampleChoice({ difficulty: 'expert' as never }));
    expect(issues.some((issue) => issue.path === 'difficulty')).toBe(true);
  });

  it('rejects an unknown kind', () => {
    const issues = validateChallenge(sampleChoice({ kind: 'trivia' as never }));
    expect(issues.some((issue) => issue.path === 'kind')).toBe(true);
  });

  it('requires options for every non-numerical kind', () => {
    const issues = validateChallenge(sampleChoice({ options: undefined }));
    expect(issues.some((issue) => issue.path === 'options')).toBe(true);
  });

  it('rejects fewer than two options and duplicate option ids', () => {
    const one = validateChallenge(sampleChoice({ options: [{ id: 'o0', label: 'only' }] }));
    expect(one.some((issue) => issue.path === 'options')).toBe(true);

    const dupes = validateChallenge(
      sampleChoice({
        options: [
          { id: 'o0', label: 'a' },
          { id: 'o0', label: 'b' },
        ],
      }),
    );
    expect(dupes.some((issue) => issue.message.includes('duplicate option id'))).toBe(true);
  });

  it('rejects an optionId that is not among the options', () => {
    const issues = validateChallenge(sampleChoice({ expectedAnswer: { kind: 'choice', optionId: 'nope' } }));
    expect(issues.some((issue) => issue.path === 'expectedAnswer.optionId')).toBe(true);
  });

  it('rejects a number answer on a non-numerical challenge', () => {
    const issues = validateChallenge(
      sampleChoice({ expectedAnswer: { kind: 'number', value: 3, tolerance: 0 } }),
    );
    expect(issues.some((issue) => issue.message.includes('only a numerical challenge'))).toBe(true);
  });

  it('rejects a negative tolerance', () => {
    const issues = validateChallenge({
      ...sampleChoice(),
      kind: 'numerical',
      options: undefined,
      expectedAnswer: { kind: 'number', value: 3, tolerance: -1 },
    });
    expect(issues.some((issue) => issue.path === 'expectedAnswer.tolerance')).toBe(true);
  });

  it('rejects a sequence shorter than its option set or with repeats', () => {
    const options = [
      { id: 'o0', label: 'a' },
      { id: 'o1', label: 'b' },
      { id: 'o2', label: 'c' },
    ];
    const shortOrder = validateChallenge({
      ...sampleChoice(),
      kind: 'sequence',
      options,
      expectedAnswer: { kind: 'sequence', order: ['o0', 'o1'] },
    });
    expect(shortOrder.some((issue) => issue.message.includes('orders 2 items'))).toBe(true);

    const repeated = validateChallenge({
      ...sampleChoice(),
      kind: 'sequence',
      options,
      expectedAnswer: { kind: 'sequence', order: ['o0', 'o0', 'o1'] },
    });
    expect(repeated.some((issue) => issue.message.includes('repeated'))).toBe(true);
  });
});

describe('validateChallengeBank', () => {
  it('detects duplicate ids', () => {
    const issues = validateChallengeBank([sampleChoice(), sampleChoice()]);
    expect(issues.some((issue) => issue.message.includes('duplicate challenge id'))).toBe(true);
  });

  it('reports the index of the offending entry', () => {
    const issues = validateChallengeBank([sampleChoice(), {}]);
    expect(issues.every((issue) => issue.path.startsWith('[1]'))).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Grading and scoring                                                        */
/* -------------------------------------------------------------------------- */

describe('gradeChallenge', () => {
  it('marks a numerical answer within tolerance correct', () => {
    const challenge: EngineChallenge = {
      ...sampleChoice({ kind: 'numerical', options: undefined }),
      expectedAnswer: { kind: 'number', value: 9, tolerance: 0.1 },
    };
    expect(gradeChallenge(challenge, { kind: 'number', value: 9.05 }).correct).toBe(true);
    expect(gradeChallenge(challenge, { kind: 'number', value: 9.2 }).correct).toBe(false);
  });

  it('marks a choice and a decision by option id', () => {
    const choice = sampleChoice();
    expect(gradeChallenge(choice, { kind: 'choice', optionId: 'o0' }).correct).toBe(true);
    expect(gradeChallenge(choice, { kind: 'choice', optionId: 'o1' }).correct).toBe(false);

    const decision = sampleChoice({ expectedAnswer: { kind: 'decision', optionId: 'o1' } });
    expect(gradeChallenge(decision, { kind: 'decision', optionId: 'o1' }).correct).toBe(true);
  });

  it('compares sequences element by element', () => {
    const challenge: EngineChallenge = {
      ...sampleChoice({
        kind: 'sequence',
        options: [
          { id: 'o0', label: 'a' },
          { id: 'o1', label: 'b' },
          { id: 'o2', label: 'c' },
        ],
      }),
      expectedAnswer: { kind: 'sequence', order: ['o1', 'o0', 'o2'] },
    };
    expect(gradeChallenge(challenge, { kind: 'sequence', order: ['o1', 'o0', 'o2'] }).correct).toBe(true);
    expect(gradeChallenge(challenge, { kind: 'sequence', order: ['o1', 'o2', 'o0'] }).correct).toBe(false);
    expect(gradeChallenge(challenge, { kind: 'sequence', order: ['o1', 'o0'] }).correct).toBe(false);
  });

  it('marks a mismatched response kind incorrect instead of throwing', () => {
    const challenge = sampleChoice();
    const response = { kind: 'number', value: 3 } as ChallengeResponse;
    const grade = gradeChallenge(challenge, response);
    expect(grade.correct).toBe(false);
    expect(grade.expected.length).toBeGreaterThan(0);
  });

  it('renders the expected and submitted answers', () => {
    const challenge = sampleChoice();
    expect(formatAnswer(challenge, challenge.expectedAnswer)).toBe('First Come, First Served');
    expect(gradeChallenge(challenge, { kind: 'choice', optionId: 'o1' }).submitted).toBe('Round Robin');
  });
});

describe('session scoring', () => {
  const set = ENGINE_CHALLENGES.slice(0, 4);

  it('counts answered, correct and percent against the whole set', () => {
    const results = { [set[0]!.id]: true, [set[1]!.id]: false, [set[2]!.id]: true };
    const score = scoreSession(set, results);
    expect(score.answered).toBe(3);
    expect(score.correct).toBe(2);
    expect(score.total).toBe(4);
    expect(score.percent).toBe(50);
  });

  it('treats unanswered questions as not counted', () => {
    const score = scoreSession(set, {});
    expect(score.answered).toBe(0);
    expect(score.percent).toBe(0);
  });

  it('computes a bounded progress percentage', () => {
    expect(progressPercent(set, 0)).toBe(0);
    expect(progressPercent(set, 2)).toBe(50);
    expect(progressPercent(set, 99)).toBe(100);
    expect(progressPercent([], 1)).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* The catalogue                                                              */
/* -------------------------------------------------------------------------- */

describe('challenge catalogue', () => {
  it('has unique challenge ids', () => {
    const ids = ENGINE_CHALLENGES.map((challenge) => challenge.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('validates every challenge in every bank', () => {
    const issues = validateChallengeBank(ENGINE_CHALLENGES);
    expect(issues, JSON.stringify(issues.slice(0, 10), null, 2)).toEqual([]);
  });

  it('uses only declared bank keys and known kinds', () => {
    const bankIds = new Set(CHALLENGE_BANKS.map((bank) => bank.id));
    for (const challenge of ENGINE_CHALLENGES) {
      expect(bankIds.has(challenge.bank), `unknown bank ${challenge.bank}`).toBe(true);
      expect(CHALLENGE_KINDS).toContain(challenge.kind);
    }
  });

  it('points every challenge at a lab that exists', () => {
    for (const challenge of ENGINE_CHALLENGES) {
      expect(getLab(challenge.relatedLab), `missing lab ${challenge.relatedLab}`).toBeDefined();
    }
  });

  it('exercises all five question kinds', () => {
    const kinds = new Set(ENGINE_CHALLENGES.map((challenge) => challenge.kind));
    for (const kind of CHALLENGE_KINDS) {
      expect(kinds.has(kind), `no ${kind} challenge in the catalogue`).toBe(true);
    }
  });

  it('offers at least ten challenges for each major topic', () => {
    const topicMinimum: Record<string, number> = {
      'cpu-scheduling': 10,
      'process-management': 10,
      synchronization: 10,
      deadlocks: 10,
      'memory-management': 10,
      'disk-scheduling': 10,
      'file-systems': 10,
    };
    for (const [topic, minimum] of Object.entries(topicMinimum)) {
      expect(challengesForTopic(topic).length, `${topic} is thin`).toBeGreaterThanOrEqual(minimum);
    }
  });

  it('keeps paging and page replacement as dedicated banks of at least ten', () => {
    const paging = ['address-translation', 'tlb', 'page-faults'].flatMap((bank) => [...challengesForBank(bank)]);
    expect(paging.length).toBeGreaterThanOrEqual(10);
    expect(challengesForBank('page-replacement').length).toBeGreaterThanOrEqual(10);
  });

  it('gives every bank a non-empty count and matching metadata', () => {
    const counts = bankCounts();
    for (const bank of listChallengeBanks()) {
      expect(CHALLENGE_BANKS).toContain(bank);
      expect(getChallengeBank(bank.id)).toBe(bank);
      expect(counts[bank.id] ?? 0).toBeGreaterThan(0);
      expect(getLab(bank.labId), `bank ${bank.id} points at a missing lab`).toBeDefined();
    }
  });

  it('resolves challenges by id, topic, bank and filter', () => {
    const first = ENGINE_CHALLENGES[0]!;
    expect(getChallenge(first.id)).toBe(first);
    expect(challengesForTopic(first.topic)).toContain(first);
    expect(challengesForBank(first.bank)).toContain(first);

    const easy = filterChallenges(ENGINE_CHALLENGES, { difficulty: 'beginner' });
    expect(easy.length).toBeGreaterThan(0);
    expect(easy.every((challenge) => challenge.difficulty === 'beginner')).toBe(true);
  });

  it('keeps every numerical answer finite and every choice answer resolvable', () => {
    for (const challenge of ENGINE_CHALLENGES) {
      const answer = challenge.expectedAnswer;
      if (answer.kind === 'number') {
        expect(Number.isFinite(answer.value), `${challenge.id} has a non-finite answer`).toBe(true);
        expect(answer.tolerance).toBeGreaterThanOrEqual(0);
      } else if (answer.kind === 'sequence') {
        expect(answer.order.length).toBe(challenge.options?.length ?? 0);
      } else {
        expect(challenge.options?.some((option) => option.id === answer.optionId)).toBe(true);
      }
    }
  });
});
