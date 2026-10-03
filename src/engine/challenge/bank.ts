import type { DifficultyLevel } from '@/types';
import { cpuSchedulingChallenges } from './builders/cpuScheduling';
import { deadlocksChallenges } from './builders/deadlocks';
import { diskSchedulingChallenges } from './builders/diskScheduling';
import { fileSystemsChallenges } from './builders/fileSystems';
import { memoryChallenges } from './builders/memory';
import { pagingChallenges } from './builders/paging';
import { pageReplacementChallenges } from './builders/pageReplacement';
import { processManagementChallenges } from './builders/processManagement';
import { synchronizationChallenges } from './builders/synchronization';
import type { Challenge, ChallengeBankInfo } from './types';

/**
 * The catalogue of banks, in reading order.
 *
 * A bank is a coherent slice of one learning area — the Banker's algorithm next
 * to wait-for graphs, address translation next to page replacement — so the
 * runner can narrow a session to a single idea. Every bank carries the lab where
 * its answers can be reproduced.
 */
export const CHALLENGE_BANKS: readonly ChallengeBankInfo[] = [
  { id: 'process-management', topic: 'process-management', title: 'Process Management', labId: 'lab-process-lifecycle' },
  { id: 'cpu-scheduling', topic: 'cpu-scheduling', title: 'CPU Scheduling', labId: 'lab-fcfs' },
  { id: 'race-conditions', topic: 'synchronization', title: 'Race Conditions', labId: 'lab-mutex' },
  { id: 'producer-consumer', topic: 'synchronization', title: 'Producer / Consumer', labId: 'lab-bounded-buffer' },
  { id: 'dining-philosophers', topic: 'synchronization', title: 'Dining Philosophers', labId: 'lab-dining-philosophers' },
  { id: 'readers-writers', topic: 'synchronization', title: 'Readers / Writers', labId: 'lab-readers-writers' },
  { id: 'bankers-algorithm', topic: 'deadlocks', title: 'Banker’s Algorithm', labId: 'lab-bankers' },
  { id: 'wait-for-graph', topic: 'deadlocks', title: 'Resource & Wait-for Graphs', labId: 'lab-wait-for-graph' },
  { id: 'placement', topic: 'memory-management', title: 'Placement Strategies', labId: 'lab-contiguous-allocation' },
  { id: 'fragmentation', topic: 'memory-management', title: 'Fragmentation & Compaction', labId: 'lab-contiguous-allocation' },
  { id: 'address-translation', topic: 'virtual-memory', title: 'Address Translation', labId: 'lab-tlb-translation' },
  { id: 'tlb', topic: 'virtual-memory', title: 'The TLB', labId: 'lab-tlb-translation' },
  { id: 'page-faults', topic: 'virtual-memory', title: 'Page Faults', labId: 'lab-tlb-translation' },
  { id: 'page-replacement', topic: 'virtual-memory', title: 'Page Replacement', labId: 'lab-page-replacement' },
  { id: 'disk-scheduling', topic: 'disk-scheduling', title: 'Disk Scheduling', labId: 'lab-disk-scheduling' },
  { id: 'allocation', topic: 'file-systems', title: 'File Allocation', labId: 'lab-file-allocation' },
  { id: 'inodes', topic: 'file-systems', title: 'Inodes & Metadata', labId: 'lab-file-allocation' },
  { id: 'space', topic: 'file-systems', title: 'Free Space', labId: 'lab-file-allocation' },
  { id: 'behaviour', topic: 'file-systems', title: 'File-System Behaviour', labId: 'lab-file-allocation' },
  { id: 'pointers', topic: 'file-systems', title: 'Block Pointers', labId: 'lab-file-allocation' },
];

const BANK_ORDER = new Map(CHALLENGE_BANKS.map((bank, index) => [bank.id, index]));

function buildAll(): Challenge[] {
  return [
    ...processManagementChallenges(),
    ...cpuSchedulingChallenges(),
    ...synchronizationChallenges(),
    ...deadlocksChallenges(),
    ...memoryChallenges(),
    ...pagingChallenges(),
    ...pageReplacementChallenges(),
    ...diskSchedulingChallenges(),
    ...fileSystemsChallenges(),
  ];
}

const ALL: readonly Challenge[] = buildAll();

/**
 * Every graded challenge, ordered by bank so the runner walks the curriculum in
 * a sensible sequence. Built once from the engines at module load; every answer
 * is derived, never hand-typed.
 */
export const CHALLENGES: readonly Challenge[] = [...ALL].sort((a, b) => {
  const bankA = BANK_ORDER.get(a.bank) ?? Number.MAX_SAFE_INTEGER;
  const bankB = BANK_ORDER.get(b.bank) ?? Number.MAX_SAFE_INTEGER;
  return bankA - bankB;
});

const BY_ID = new Map(CHALLENGES.map((challenge) => [challenge.id, challenge]));

export function getChallenge(id: string): Challenge | undefined {
  return BY_ID.get(id);
}

export function listChallengeBanks(): readonly ChallengeBankInfo[] {
  return CHALLENGE_BANKS;
}

export function getChallengeBank(id: string): ChallengeBankInfo | undefined {
  return CHALLENGE_BANKS.find((bank) => bank.id === id);
}

export function challengesForTopic(topic: string): readonly Challenge[] {
  return CHALLENGES.filter((challenge) => challenge.topic === topic);
}

export function challengesForBank(bank: string): readonly Challenge[] {
  return CHALLENGES.filter((challenge) => challenge.bank === bank);
}

export function challengesForLab(labId: string): readonly Challenge[] {
  return CHALLENGES.filter((challenge) => challenge.relatedLab === labId);
}

export interface ChallengeFilter {
  readonly difficulty?: DifficultyLevel;
  readonly topic?: string;
  readonly bank?: string;
}

export function filterChallenges(
  challenges: readonly Challenge[],
  filter: ChallengeFilter,
): readonly Challenge[] {
  return challenges.filter((challenge) => {
    if (filter.difficulty && challenge.difficulty !== filter.difficulty) return false;
    if (filter.topic && challenge.topic !== filter.topic) return false;
    if (filter.bank && challenge.bank !== filter.bank) return false;
    return true;
  });
}

/** How many challenges each bank contributes, for the picker’s copy. */
export function bankCounts(): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const challenge of CHALLENGES) {
    counts[challenge.bank] = (counts[challenge.bank] ?? 0) + 1;
  }
  return counts;
}
