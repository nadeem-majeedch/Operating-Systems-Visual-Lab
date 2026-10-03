import type { SyncKind } from '@/engine';

export interface SyncConcept {
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly keyPoints: readonly string[];
}

/** Shared vocabulary for every synchronization lab. */
const LOCK_VOCABULARY: readonly string[] = [
  'Race condition: the result depends on the order in which concurrent accesses interleave.',
  'Critical section: code that must not run concurrently with itself.',
  'Mutual exclusion: at most one process is inside the critical section at a time.',
  'Progress: if no one is inside and someone wants in, the choice is not postponed forever.',
  'Bounded waiting: there is a limit on how long a process can be bypassed.',
  'A mutex is a lock with ownership; a semaphore is a counter that blocks instead of spinning.',
];

export const SYNC_CONCEPTS: Record<SyncKind, SyncConcept> = {
  race: {
    title: 'Race conditions, critical sections and mutual exclusion',
    paragraphs: [
      'A race condition happens when two or more processes touch shared data at the same time and the final result depends on the exact order of their accesses. The classic example is an increment, which is not one operation but three: load the value into a register, add one, and store it back.',
      'If two processes both load before either stores, they both compute the same new value and one store overwrites the other. The second increment silently disappears — this is a lost update, and it is the reason shared mutable state needs protection.',
      'The fix is a critical section: the load–add–store triple must be executed as if it were atomic. A mutex or a binary semaphore provides mutual exclusion, so a second process that tries to enter while the lock is held blocks until the holder leaves. Blocking is what makes this correct and efficient; spinning would waste the CPU.',
      'Mutual exclusion alone is not the whole story. A correct critical-section solution also needs progress — someone waiting must eventually get in — and bounded waiting, meaning no process is repeatedly bypassed while others overtake it. Without those, a lock can still starve a process even though it never runs concurrently.',
    ],
    keyPoints: LOCK_VOCABULARY,
  },
  'producer-consumer': {
    title: 'The bounded buffer',
    paragraphs: [
      'The producer/consumer problem is the canonical place where two different kinds of constraint meet. Capacity is a counting problem: producers must stop when the buffer is full, and consumers must stop when it is empty. Mutual exclusion is a locking problem: the buffer array itself is shared, so only one actor may touch it at a time.',
      'That is why three semaphores are used. `empty` counts free slots and starts at the capacity; `full` counts buffered items and starts at zero; `mutex` is a binary lock guarding the array. A producer waits on empty before it puts, and signals full afterwards; a consumer waits on full before it takes, and signals empty afterwards.',
      'The order of the wait calls is load-bearing. Doing wait(empty) before wait(mutex) means a producer reserves space before contending for the lock, so it never holds the lock while blocked on capacity. Swapping them lets a producer hold the lock while waiting for a free slot, which is a deadlock waiting to happen.',
    ],
    keyPoints: [
      'empty + full stays equal to the buffer capacity.',
      'A semaphore value below zero is the number of blocked actors waiting on it.',
      'mutex is about the shared array, not about capacity.',
      'Blocking on a full buffer is flow control, not a bug.',
      'Reserve capacity before locking to avoid hold-and-wait.',
    ],
  },
  philosophers: {
    title: 'Dining philosophers and deadlock',
    paragraphs: [
      'Five philosophers sit around a table with five forks, one between each pair. A philosopher needs both neighbouring forks to eat. A fork is a single-owner resource, so it is exactly the kind of lock the previous labs introduced — but here the philosophers need two at once.',
      'If everyone reaches for the left fork first and then the right, every philosopher ends up holding one fork and waiting for the other. Nobody can proceed and nobody releases anything: the circular wait has closed. This is a deadlock, and it is not a crash — the system simply stops making progress.',
      'Deadlock requires four conditions at once: mutual exclusion, hold-and-wait, no preemption, and circular wait. Removing any one of them prevents it. Making the last philosopher pick up the right fork first breaks the circular wait; limiting the table to n − 1 philosophers breaks hold-and-wait by ensuring someone can always get both forks.',
    ],
    keyPoints: [
      'A fork has exactly one owner — it is a lock.',
      'Holding one resource while waiting for another is hold-and-wait.',
      'A cycle of waits is a deadlock, not merely slow progress.',
      'Break the cycle by ordering acquisitions or limiting concurrency.',
      'Deadlock needs all four Coffman conditions; removing one is enough.',
    ],
  },
  'readers-writers': {
    title: 'Readers and writers',
    paragraphs: [
      'Some shared data is read far more often than it is changed. Reads do not conflict with each other — any number of readers can inspect the data at once — but a write must exclude everyone, because a read that overlaps a write could observe a half-finished update. Readers/writers captures this asymmetry.',
      'A counter, `readCount`, records how many readers are inside, and it is protected by its own mutex. The first reader to enter also acquires the write lock, blocking writers; the last reader to leave releases it, letting a writer in. Readers can therefore overlap freely while writers remain exclusive.',
      'The cost is fairness. With readers preference, new readers may enter as long as no writer is active, so a steady stream of readers can keep a writer waiting indefinitely — starvation, even though the system is not deadlocked. A fair or writer-preferring policy would hand the lock to the longest-waiting writer instead.',
    ],
    keyPoints: [
      'Readers share; writers exclude everyone.',
      'readCount is itself shared, so it needs its own mutex.',
      'First reader in takes the write lock; last reader out releases it.',
      'A writer active means zero readers and zero readCount.',
      'Readers preference can starve writers — fairness is a policy choice.',
    ],
  },
};
