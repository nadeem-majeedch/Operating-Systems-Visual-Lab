import { describe, expect, it } from 'vitest';
import {
  SCHEDULING_CHALLENGE_COUNT,
  PRIORITY_ALGORITHM_ID,
  buildSchedulingChallenges,
  simulateFcfs,
  simulatePriority,
  simulateSjf,
  simulateSrtf,
  type SchedulingChallenge,
} from '@/engine';

const challenges = buildSchedulingChallenges();

function byId(id: string): SchedulingChallenge {
  const challenge = challenges.find((item) => item.id === id);
  if (!challenge) throw new Error(`missing challenge ${id}`);
  return challenge;
}

function answerTo(challenge: SchedulingChallenge): string {
  return challenge.options[challenge.correctIndex] ?? '';
}

describe('challenge set', () => {
  it('ships exactly ten deterministic questions', () => {
    expect(SCHEDULING_CHALLENGE_COUNT).toBe(10);
    expect(challenges).toHaveLength(10);
    const ids = challenges.map((challenge) => challenge.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('rebuilds identically every time', () => {
    expect(buildSchedulingChallenges()).toEqual(challenges);
  });

  it('gives every question a prompt, options and an in-range answer', () => {
    for (const challenge of challenges) {
      expect(challenge.prompt.length, challenge.id).toBeGreaterThan(10);
      expect(challenge.explanation.length, challenge.id).toBeGreaterThan(10);
      expect(challenge.options.length, challenge.id).toBeGreaterThanOrEqual(3);
      expect(new Set(challenge.options).size, `${challenge.id} options unique`).toBe(
        challenge.options.length,
      );
      expect(challenge.correctIndex, challenge.id).toBeGreaterThanOrEqual(0);
      expect(challenge.correctIndex, challenge.id).toBeLessThan(challenge.options.length);
    }
  });

  it('covers every requested question type', () => {
    const kinds = new Set(challenges.map((challenge) => challenge.kind));
    for (const required of [
      'next-segment',
      'completion-time',
      'waiting-time',
      'preempted-process',
      'after-preemption',
    ]) {
      expect(kinds, `missing kind ${required}`).toContain(required);
    }
  });
});

describe('answers match the engine', () => {
  it('computes a completion time from the FCFS schedule', () => {
    const challenge = byId('challenge-completion-time');
    const run = simulateFcfs({ processes: challenge.processes });
    const p2 = run.steps[run.steps.length - 1]?.data.results.find((r) => r.processId === 'p2');
    expect(answerTo(challenge)).toBe(String(p2?.completionTime));
    expect(answerTo(challenge)).toBe('7');
  });

  it('computes a waiting time from the FCFS schedule', () => {
    const challenge = byId('challenge-waiting-time');
    const run = simulateFcfs({ processes: challenge.processes });
    const p3 = run.steps[run.steps.length - 1]?.data.results.find((r) => r.processId === 'p3');
    expect(answerTo(challenge)).toBe(String(p3?.waitingTime));
    expect(answerTo(challenge)).toBe('5');
  });

  it('computes a turnaround time from the SJF schedule', () => {
    const challenge = byId('challenge-turnaround-sjf');
    const run = simulateSjf({ processes: challenge.processes });
    const p2 = run.steps[run.steps.length - 1]?.data.results.find((r) => r.processId === 'p2');
    expect(answerTo(challenge)).toBe(String(p2?.turnaroundTime));
    expect(answerTo(challenge)).toBe('4');
  });

  it('reads the next Gantt segment out of the SJF timeline', () => {
    const challenge = byId('challenge-next-segment-sjf');
    const run = simulateSjf({ processes: challenge.processes });
    const timeline = run.steps[run.steps.length - 1]?.data.timeline ?? [];
    expect(challenge.atClock).toBe(timeline[0]?.end);
    expect(answerTo(challenge)).toBe(timeline[1]?.label);
    expect(answerTo(challenge)).toBe('P2');
    expect(challenge.previewTimeline.length).toBeGreaterThan(0);
  });

  it('detects the preempted process under SRTF', () => {
    const challenge = byId('challenge-preempted');
    const run = simulateSrtf({ processes: challenge.processes });
    const step = run.steps.find((item) => item.label.endsWith('preempted'));
    expect(challenge.atClock).toBe(step?.clock);
    expect(step?.data.runningProcessId).toBe('p1');
    expect(answerTo(challenge)).toBe('P1');
  });

  it('names the process that runs immediately after a preemption', () => {
    const challenge = byId('challenge-after-preemption');
    const run = simulateSrtf({ processes: challenge.processes });
    const boundary = challenge.atClock ?? 0;
    const next = (run.steps[run.steps.length - 1]?.data.timeline ?? []).find(
      (segment) => segment.start >= boundary,
    );
    expect(answerTo(challenge)).toBe(next?.label);
    expect(answerTo(challenge)).toBe('P2');
  });

  it('finds the first completion under non-preemptive priority', () => {
    const challenge = byId('challenge-first-completion');
    const run = simulatePriority({ processes: challenge.processes });
    const first = [...(run.steps[run.steps.length - 1]?.data.results ?? [])].sort(
      (a, b) => a.completionTime - b.completionTime,
    )[0];
    expect(answerTo(challenge)).toBe(first?.processName);
    expect(answerTo(challenge)).toBe('P1');
  });

  it('counts context switches with the engine', () => {
    const challenge = byId('challenge-context-switches');
    const run = simulateFcfs({ processes: challenge.processes });
    expect(answerTo(challenge)).toBe(String(run.summary.contextSwitches));
    expect(answerTo(challenge)).toBe('2');
  });

  it('reports CPU utilisation as a percentage', () => {
    const challenge = byId('challenge-utilization');
    const run = simulateFcfs({ processes: challenge.processes });
    const expected = `${Math.round((run.summary.cpuUtilization ?? 0) * 100)}%`;
    expect(answerTo(challenge)).toBe(expected);
    expect(answerTo(challenge)).toBe('42%');
  });

  it('uses the priority engine id for the priority challenge', () => {
    expect(byId('challenge-first-completion').algorithmId).toBe(PRIORITY_ALGORITHM_ID);
  });
});
