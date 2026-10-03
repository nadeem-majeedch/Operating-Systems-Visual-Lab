# CPU Scheduling

**Prerequisites:** [Process Management](process-management.md). **Guided lesson:**
`#/learn/cpu-scheduling`. **Area page:** `#/topics/cpu-scheduling`

One CPU can run one process at a time. Scheduling is the policy that decides which *ready* process
becomes the *running* one, and that single decision determines how long everyone else waits.

## Why it matters

Scheduling is the clearest example in the course of a trade-off you can measure. Every policy here
optimises something different — average waiting time, responsiveness, urgency, fairness — and you can
watch the numbers move as you change policy or quantum. The three metrics you learn here (turnaround,
waiting and response time) reappear in every other performance discussion.

## Learning objectives

- Distinguish preemptive from non-preemptive scheduling.
- Compute turnaround, waiting and response time for every process in a run.
- Prove that shortest-first minimises average waiting time for simultaneous arrivals, and identify the
  arrival patterns where it stops being optimal.
- Explain the convoy effect and why shortest-first can starve a long job.
- Choose a time quantum for Round Robin and justify the trade-off.
- Explain how real schedulers estimate burst time, given that it is not known in advance.

## Key terminology

| Term | Meaning |
|------|---------|
| **Burst time** | How much CPU work a process needs before it finishes or blocks. |
| **Turnaround time** | Completion − arrival: the total time the process spent in the system. |
| **Waiting time** | Turnaround − burst: time spent ready but not on the CPU. |
| **Response time** | First dispatch − arrival: how long until a process first runs. |
| **Time quantum** | The slice of CPU a Round Robin process gets before it is rotated to the back of the queue. |
| **Convoy effect** | Many short jobs stuck behind one long one, inflating average waiting time. |
| **Preemptive** | The policy may take the CPU back from a running process before it finishes. |

Two identities worth memorising, because every question in this area uses them:

```
turnaround = completion − arrival
waiting    = turnaround − burst
```

## Algorithms in this area

| Algorithm | Policy | Preemptive | Optimal for average waiting | Needs future knowledge | Lab |
|-----------|--------|:----------:|:---------------------------:|:----------------------:|-----|
| **FCFS** — First Come, First Served | Run strictly in arrival order, to completion | No | No | No | `#/labs/lab-fcfs` |
| **SJF** — Shortest Job First | Among ready jobs, pick the smallest burst | No | Yes (simultaneous arrivals) | Yes | `#/labs/lab-sjf` |
| **SRTF** — Shortest Remaining Time First | Preempt whenever a shorter job arrives | Yes | Yes | Yes | `#/labs/lab-sjf` |
| **Round Robin** | One quantum each, then to the back of the queue | Yes | No | No | `#/labs/lab-round-robin` |
| **Priority** | Highest priority ready process wins (lower number = higher priority) | No | No | No | `#/labs/lab-priority-scheduling` |
| **Preemptive Priority** | As above, but preempt on a higher-priority arrival | Yes | No | No | `#/labs/lab-priority-scheduling` |

Notes that the reference entries make explicit:

- **FCFS has no tuning parameters** — arrival order *is* the policy. Its cost is not average case but
  variance: one long job at the front delays everyone.
- **SJF is optimal only for simultaneous arrivals.** With staggered arrivals the proof breaks, which is
  exactly what the *Break the optimality of SJF* challenge asks you to construct.
- **SRTF improves average waiting time further** at the price of more context switches and more
  bookkeeping.
- **Round Robin's only parameter is the quantum** (default 4, range 1–20 in the lab). A quantum larger
  than every burst degenerates the policy into FCFS.
- **Priority scheduling in this lab uses lower numbers for higher priority.** Neither variant includes
  aging, which is why a steady stream of urgent arrivals starves low-priority work — that is the lesson,
  not a bug.

## Labs

| Lab | Route | Difficulty | Time | What you do |
|-----|-------|------------|------|-------------|
| **First Come, First Served** | `#/labs/lab-fcfs` | Beginner | ~15 min | Build a Gantt chart from an arrival table and watch the running averages |
| **Shortest Job First** | `#/labs/lab-sjf` | Intermediate | ~20 min | Compare SJF and SRTF against FCFS on one workload |
| **Round Robin & Time Quantum** | `#/labs/lab-round-robin` | Intermediate | ~20 min | Tune the quantum and watch responsiveness trade against context switches |
| **Priority Scheduling** | `#/labs/lab-priority-scheduling` | Intermediate | ~20 min | Run the non-preemptive and preemptive variants on the same arrivals |

Every lab reports **makespan, idle time, CPU utilisation, throughput, average turnaround, average
waiting, average response and context-switch count**. Because the engines are deterministic, the same
input always produces the same chart and the same numbers.

## Guided lesson

`#/learn/cpu-scheduling` — *Who runs next?* (Beginner, ~35 minutes, 6 stages).

**Experiment (stage 3).** In the Round Robin lab, use four processes of 4 units each arriving at
t = 0, then try quantum 1, 2 and 8. You should observe that:

- Average response time is smallest for the smallest quantum.
- The context-switch count climbs as the quantum shrinks.
- At a quantum larger than 4 the schedule collapses to FCFS, and everything waits behind P1.

## Worked walkthrough: SJF on a batch

All three processes arrive at t = 0, so the policy is free to reorder them.

| Step | Result |
|------|--------|
| List the arrivals | P1(0, 5), P2(0, 3), P3(0, 8) — arrival, burst |
| Order by burst | SJF picks P2 (3), then P1 (5), then P3 (8) |
| Read the completion times | P2 finishes at 3, P1 at 8, P3 at 16 |
| Compute waiting times | Waiting = completion − arrival − burst: P2 → 0, P1 → 3, P3 → 8 |
| Compare with FCFS | FCFS runs in arrival order and averages **4.33** waiting against SJF's **3.67** |

(Those two averages are what the engine reports for this exact workload — you can reproduce them by
loading the same arrivals into each lab.)

## Common mistakes

| Mistake | Correction |
|---------|------------|
| Mixing up turnaround and waiting time | Turnaround counts from arrival to completion; waiting subtracts the time actually run. |
| Assuming SJF is always optimal | It is optimal only when every job is ready together; staggered arrivals break the proof. |
| Thinking a huge Round Robin quantum is fine | A quantum larger than every burst turns Round Robin into FCFS and destroys responsiveness. |
| Judging a policy by its best case | Preemptive priority has an excellent best case and an unbounded worst case — look for the starvation, not the average. |

## Challenge bank and open challenges

**Bank:** `cpu-scheduling` — 12 graded questions reproducible in `#/labs/lab-fcfs`.

Formats you will meet here: *prediction* ("which process runs next?"), *sequence* (order the dispatch
events), *numerical* (give the average waiting time) and *decision* (choose the policy for a described
workload).

**Open challenges** (`#/challenges`):

- *Quantify the convoy effect* — a 12-unit job arrives at t = 0 and three 2-unit jobs arrive at t = 1,
  2, 3. Run it under FCFS and report the waiting times, the average, and which property causes the short
  jobs to wait. (Reference outcome: waiting times **0, 11, 12, 13**, average **9.0**, makespan **18**.)
- *Choose a time quantum* — justify a quantum for an interactive workload.
- *Break the optimality of SJF* — construct staggered arrivals where FCFS beats SJF on average waiting
  time.

## Check yourself

- When would you deliberately accept a longer average waiting time for a better response time?
- Why does SRTF perform more context switches than SJF?
- Sketch an arrival pattern where FCFS beats SJF on average waiting time.
- Why can no real scheduler use SJF exactly, and what do real schedulers use instead?

## Related

- Previous: [process-management.md](process-management.md) — the `ready → running` transition the
  scheduler performs.
- Next: [synchronization.md](synchronization.md) — what happens when the processes share data.
- Reference: Silberschatz, Galvin & Gagne, *Operating System Concepts*, the CPU-scheduling chapter.
