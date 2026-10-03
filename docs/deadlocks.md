# Deadlocks

**Prerequisites:** [Process Synchronization](synchronization.md). **Guided lesson:**
`#/learn/deadlocks`. **Area page:** `#/topics/deadlocks`

A deadlock is not a crash. Nothing has failed, no error has been raised, and every process is doing
exactly what it was told. The system has simply reached a state where each participant is waiting for
something another participant holds, so none of them can ever move.

## Why it matters

This is the area where "correct" stops being the same as "safe". Each individual step in a deadlocked
run is legal; the problem is the global state. You will learn three ways to deal with that — prevent,
avoid, or detect — and see why real systems rarely pay for the strongest guarantee.

The banker's algorithm is also the best exercise in the course for reading a table carefully: the whole
method is one loop over a matrix, and every mistake is an arithmetic one you can catch.

## Learning objectives

- List the four Coffman conditions and find each one in a scenario.
- Detect deadlock with a wait-for graph, and say exactly when a cycle *proves* it.
- Apply the safety algorithm from the banker's algorithm to a resource state.
- Distinguish **unsafe** from **deadlocked**, and explain why that distinction matters.
- Explain the throughput cost of avoidance.

## Key terminology

| Term | Meaning |
|------|---------|
| **Deadlock** | A set of processes each waiting for a resource another holds, so none can proceed. |
| **Coffman conditions** | Mutual exclusion, hold and wait, no preemption and circular wait — all four are required. |
| **Wait-for graph** | A graph of process → process waits, used for single-instance detection. |
| **Safe state** | A state from which some completion order exists for every process. |
| **Unsafe state** | No such order is *guaranteed* under worst-case demands — not the same as deadlocked. |
| **Avoidance** | Refusing a request that would make the state unsafe, before any deadlock forms. |
| **Detection** | Letting deadlock happen and finding it afterwards. |

### The four Coffman conditions

All four must hold simultaneously; breaking any one makes deadlock impossible.

1. **Mutual exclusion** — a resource is held exclusively.
2. **Hold and wait** — a process holds one resource while requesting another.
3. **No preemption** — a resource cannot be taken away; it must be released voluntarily.
4. **Circular wait** — a closed chain of processes each waiting for the next.

The Dining Philosophers lab in [synchronization](synchronization.md) is the standard place to *see* all
four at once.

## Three responses to deadlock

| Approach | When it acts | Idea | Cost |
|----------|--------------|------|------|
| **Prevention** | Up front, by design | Break one Coffman condition — e.g. require everything at once (no hold-and-wait), or impose a global order on resources (no circular wait) | Usually restricts how work can be scheduled |
| **Avoidance** | On every request | Keep every state safe using advance knowledge of each process's maximum demand, as the banker's algorithm does | Conservative; refuses requests that would actually have been fine |
| **Detection** | After the fact | Let deadlock happen, find it (cycle, or reduction), and recover by aborting or rolling back | Requires periodic checking and a recovery mechanism |

## Algorithms in this area

| Algorithm | What it does | Notes | Lab |
|-----------|--------------|-------|-----|
| **Banker's Algorithm** | Grants a request only if a safe sequence still exists | Time ≈ O(n²·m), space O(n·m) for n processes and m resource types | `#/labs/lab-bankers` |
| **Wait-for Graph Detection** | Collapses a resource-allocation graph into process → process edges and looks for a cycle | For **single-instance** resources a cycle is necessary *and* sufficient | `#/labs/lab-wait-for-graph` |
| **Reduction algorithm** | Repeatedly finishes any process whose request can be met | The correct test when resource types have **multiple instances**; a cycle alone is not enough | `#/labs/lab-wait-for-graph` |

The asymmetry in the last two rows is the single most examinable point in this area: a cycle proves
deadlock only in the single-instance case.

## Labs

| Lab | Route | Difficulty | Time | What you do |
|-----|-------|------------|------|-------------|
| **Banker's Algorithm** | `#/labs/lab-bankers` | Advanced | ~30 min | Edit the allocation, max and available matrices, then request resources and follow the safety check |
| **Resource & Wait-for Graphs** | `#/labs/lab-wait-for-graph` | Intermediate | ~20 min | Build a resource-allocation graph, collapse it into waits, and apply the reduction algorithm |

The banker's lab ships four presets, and they are worth working through in order:

| Preset | State | What it shows |
|--------|-------|---------------|
| *Classic safe state* | available [3,3,2], 5 processes, 3 resources | The standard worked example, safe |
| *Request that can be granted* | P1 requests [1,0,2] | A request that survives the safety check |
| *Request that must wait* | P4 requests [3,3,0] | A request that fails it and is rolled back, leaving the matrices unchanged |
| *Unsafe state* | 3 processes, 2 resources | A state with no safe sequence at all |

The graph lab ships an *acyclic* scenario, a *deadlock* scenario, and one labelled **"Cycle, but not
deadlocked"** — a multiple-instance case where a cycle exists and the reduction algorithm still finds a
completion order. Do not skip that one.

## Guided lesson

`#/learn/deadlocks` — *When progress stops for good* (Advanced, ~40 minutes, 6 stages).

**Experiment (stage 3).** In the Banker's Algorithm lab, load the *Classic safe state*, then request
**[1,0,2] for P1**, and afterwards **[3,3,0] for P4**. You should observe that:

- The first request survives the safety check and is granted.
- The second fails it, so the tentative allocation is rolled back and P4 waits.
- The allocation table is identical before and after a deferred request.

## Worked walkthrough: the safety algorithm

Using the *Classic safe state* preset: processes P0–P4, resources A, B, C, and available **[3,3,2]**.

| Step | Working |
|------|---------|
| **Compute need** | `need = max − allocation`, resource by resource |
| **Start from available** | `work` begins as [3,3,2] |
| **Find a fit** | P1 needs [1,2,2] ≤ [3,3,2] → P1 finishes; `work` becomes [5,3,2] |
| **Release and repeat** | P3 needs [0,1,1] → `work` [7,4,3]; P0 needs [7,4,3] → `work` [7,5,3]; P2 needs [6,0,0] → `work` [10,5,5]; P4 needs [4,3,1] → `work` [10,5,7] |
| **Conclude** | Every process finished, so the state is safe — here with the sequence **P1 → P3 → P0 → P2 → P4** |

The need matrix for this state, for reference:

| | A | B | C |
|---|---|---|---|
| P0 | 7 | 4 | 3 |
| P1 | 1 | 2 | 2 |
| P2 | 6 | 0 | 0 |
| P3 | 0 | 1 | 1 |
| P4 | 4 | 3 | 1 |

> **Multiple safe sequences can exist.** The sequence above is the one this engine picks (earliest index
> first); the textbook's order for the same state is also valid. A state is safe if *at least one*
> sequence works — you do not have to find "the" sequence, and a different order is not a mistake.

## Common mistakes

| Mistake | Correction |
|---------|------------|
| Treating **unsafe** as **deadlocked** | Unsafe only means no guaranteed completion order under worst-case demands; no deadlock need occur. |
| Using a cycle to prove deadlock with multiple instances | A cycle is sufficient only when every resource in it has a single instance. |
| Thinking detection prevents deadlock | Detection notices an existing deadlock; avoidance keeps the system out of unsafe states in the first place. |
| Panicking when your safe sequence differs from the book's | Several safe sequences usually exist for the same state. |
| Forgetting that a request must be declared in advance | The banker's algorithm needs each process's *maximum* up front; without it, avoidance is impossible. |

## Challenge banks and open challenges

**Banks** (13 graded questions total):

| Bank | Questions | Lab |
|------|:---------:|-----|
| `bankers-algorithm` | 7 | `#/labs/lab-bankers` |
| `wait-for-graph` | 6 | `#/labs/lab-wait-for-graph` |

Questions ask for safe-sequence lengths, request outcomes, cycle lengths, and whether a described state
is safe — all derived by running the engine, not typed by hand.

**Open challenges** (`#/challenges`):

- *Find a safe sequence* — produce one for a given matrix state and justify each step.
- *Cycle does not always mean deadlock* — give a multiple-instance scenario whose wait-for graph has a
  cycle but which is not deadlocked, and show the completion order that proves it.

## Check yourself

- Give a concrete way to break each Coffman condition in a real system.
- Why does the banker's algorithm cost throughput, and when is that acceptable?
- Construct a wait-for graph with a cycle that is not a deadlock.
- In a single-instance system, is detecting a cycle enough to declare deadlock? In a multiple-instance
  system, why not?

## Related

- Previous: [synchronization.md](synchronization.md) — the fork-holding pattern that creates circular
  wait.
- Next: [memory-management.md](memory-management.md) — resources that cannot be preempted cheaply.
- Reference: Silberschatz, Galvin & Gagne, *Operating System Concepts*, the deadlocks chapter.
