# Process Synchronization

**Prerequisites:** [Process Management](process-management.md). **Guided lesson:**
`#/learn/synchronization`. **Area page:** `#/topics/synchronization`

Concurrency bugs are the hardest kind to believe in, because the code looks correct and usually runs
correctly. This area makes the failure visible: you interleave threads by hand, watch an update
disappear, and then repair it.

## Why it matters

A single statement in your source code is rarely a single operation on the machine. `counter = counter
+ 1` compiles to a load, an add and a store, and another thread can run between any two of them. Once
you have *seen* a lost update happen, the need for mutual exclusion stops being an abstract rule and
becomes obvious.

The second half of the area is about what correctness *costs*: locks serialise, semaphores block, and
the order in which you acquire them can freeze the system. That is the bridge to
[deadlocks](deadlocks.md).

## Learning objectives

- Explain why a non-atomic read–modify–write can lose updates.
- State the three requirements of a correct critical-section solution.
- Use counting semaphores to express a capacity constraint, as in the bounded buffer.
- Recognise why the order of `wait()` calls matters, and how the wrong order deadlocks.
- Explain why readers may share data while writers may not, and how readers preference can starve a
  writer.

## Key terminology

| Term | Meaning |
|------|---------|
| **Race condition** | A result that depends on the timing of concurrent accesses to shared data. |
| **Critical section** | Code that touches shared state and must not run in more than one thread at a time. |
| **Mutual exclusion** | The guarantee that at most one thread is inside a critical section. |
| **Semaphore** | A counter with `wait()` and `signal()`; `wait()` blocks when the count would go negative. |
| **Atomicity** | An operation that either completes fully or not at all, with no interleaving in between. |
| **Starvation** | A thread that is runnable but never scheduled, because others keep overtaking it. |

### The three requirements of a critical section

1. **Mutual exclusion** — at most one thread is inside at a time.
2. **Progress** — if the section is free and someone wants in, someone gets in; the decision cannot be
   postponed indefinitely by a thread that is not in its critical section.
3. **Bounded waiting** — a thread cannot be overtaken an unbounded number of times while waiting.

A solution that gives mutual exclusion but no bounded waiting is correct on paper and useless in
practice: that is what the readers/writers starvation demonstration shows.

## Algorithms in this area

| Algorithm | Idea | What it demonstrates | Lab |
|-----------|------|----------------------|-----|
| **Mutex Lock** | A binary lock around the critical section | Mutual exclusion; correctness still depends on pairing lock and unlock on every path | `#/labs/lab-mutex` |
| **Counting Semaphore** | A counter that blocks the caller when it would go negative | Modelling capacity rather than ownership | `#/labs/lab-mutex`, `#/labs/lab-bounded-buffer` |
| **Bounded Buffer** | `empty`, `full` and `mutex` together | Producer/consumer lock-step; why the *order* of `wait()` calls matters | `#/labs/lab-bounded-buffer` |
| **Dining Philosophers** | Five philosophers, five forks, two acquisition orders | Circular wait; how resource ordering removes it | `#/labs/lab-dining-philosophers` |
| **Readers / Writers** | A read count guarded by its own mutex | Concurrent readers vs exclusive writers, and readers-preference starvation | `#/labs/lab-readers-writers` |

The canonical producer/consumer arrangement, and the invariant it maintains:

```
semaphore empty = capacity, full = 0, mutex = 1

producer                          consumer
    wait(empty)                       wait(full)
    wait(mutex)                       wait(mutex)
    put item into buffer              item = take from buffer
    signal(mutex)                     signal(mutex)
    signal(full)                      signal(empty)

empty + full == capacity at all times
```

Two facts the labs make concrete:

- `wait()` **blocks** the caller rather than spinning, so a full buffer costs no CPU.
- Swapping the order of the two `wait()` calls in the producer (taking `mutex` before `empty`) lets a
  producer hold the lock while blocked — which is how the bounded buffer deadlocks.

## Labs

| Lab | Route | Difficulty | Time | What you do |
|-----|-------|------------|------|-------------|
| **Critical Sections & Mutual Exclusion** | `#/labs/lab-mutex` | Beginner | ~20 min | Race two threads on a shared counter instruction by instruction, then fix it |
| **Bounded Buffer** | `#/labs/lab-bounded-buffer` | Intermediate | ~25 min | Drive producers and consumers through empty, full and mutex |
| **Dining Philosophers** | `#/labs/lab-dining-philosophers` | Intermediate | ~20 min | Deadlock the table, then break the circular wait |
| **Readers & Writers** | `#/labs/lab-readers-writers` | Intermediate | ~20 min | Let readers share while writers take the data exclusively |

The mutex lab shows each thread's private registers alongside the shared counter, so you can literally
see two threads hold stale copies of the same value.

## Guided lesson

`#/learn/synchronization` — *Making concurrent code correct* (Intermediate, ~35 minutes, 6 stages).

**Experiment (stage 3).** In the Bounded Buffer lab, run **two producers and one consumer over a
two-slot buffer**. You should observe that:

- A producer blocks exactly when the buffer is full — the buffer never overflows.
- The consumer's `signal` on `empty` wakes the blocked producer.
- `mutex` is held only for the array access, never while waiting on a semaphore.

## Worked walkthrough: a lost update, repaired

| Step | What happens |
|------|--------------|
| **Two increments each** | Two threads each run `counter = counter + 1` twice, so the correct total is **4**. |
| **Interleave the loads** | Both loads read **0** before either store runs. |
| **Watch both stores** | The first store writes **1**; the second overwrites it with **1**, losing an update. |
| **Add the lock** | A mutex lets only one thread run the whole load–add–store triple at a time. |
| **Check the total** | The counter now reaches exactly **4**, and both threads still make progress. |

## Common mistakes

| Mistake | Correction |
|---------|------------|
| Assuming a single increment is atomic | It compiles to load, add and store — three steps another thread can interrupt. |
| Thinking a mutex makes an operation instant | A mutex serialises access; it removes concurrency, it does not speed anything up. |
| Acquiring a mutex before checking a counting semaphore | That can hold the lock while blocking, which is how the bounded buffer deadlocks. |
| Treating "it passed once" as proof of correctness | An interleaving that did not happen this run can happen next run. |

## Challenge banks and open challenges

**Banks** (13 graded questions total), all reproducible in the labs above:

| Bank | Questions | Lab |
|------|:---------:|-----|
| `race-conditions` | 5 | `#/labs/lab-mutex` |
| `producer-consumer` | 3 | `#/labs/lab-bounded-buffer` |
| `dining-philosophers` | 3 | `#/labs/lab-dining-philosophers` |
| `readers-writers` | 2 | `#/labs/lab-readers-writers` |

**Open challenges** (`#/challenges`):

- *Produce a lost update by hand* — pick the interleaving that loses an update on a protected-ish
  counter and state exactly which store overwrites which.
- *Deadlock the bounded buffer* — change the order of the semaphore operations, describe the resulting
  cycle, and name the fix.

## Check yourself

- Why is "it passed once" not evidence that concurrent code is correct?
- What are the three requirements of a critical-section solution, in your own words?
- Describe a change to the producers/consumers that would deadlock the buffer, and explain the cycle.
- Why can readers run concurrently while writers cannot, and what does that cost a writer?

## Related

- Previous: [cpu-scheduling.md](cpu-scheduling.md) — preemption is what makes interleaving possible.
- Next: [deadlocks.md](deadlocks.md) — what happens when the "wrong order" has no fix at runtime.
- Reference: Silberschatz, Galvin & Gagne, *Operating System Concepts*, the synchronization chapter;
  Arpaci-Dusseau, *Operating Systems: Three Easy Pieces*, the concurrency chapters.
