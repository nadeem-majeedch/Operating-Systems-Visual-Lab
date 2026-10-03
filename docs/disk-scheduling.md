# Disk Scheduling

**Prerequisites:** none for this area, though [CPU Scheduling](cpu-scheduling.md) introduces the same
"order changes the cost" idea where the cost is time rather than distance. **Guided lesson:**
`#/learn/disk-scheduling`. **Area page:** `#/topics/disk-scheduling`

A magnetic disk has to move a physical head to the cylinder it wants. That movement — the **seek** — is
usually the dominant cost of serving a request, and it is proportional to how far the head travels. Disk
scheduling is only about choosing an order for the queue that reduces that travel without starving
anyone.

## Why it matters

This is the cleanest policy-comparison exercise in the course: one queue, one measurable number (total
head movement), six policies, and a genuine fairness trade-off. It also teaches you to be suspicious of
greedy algorithms — SSTF is the best policy on the metric *and* the one that can ignore a request
forever.

## Learning objectives

- Compute total head movement and average seek distance for a request queue.
- Explain the starvation risk of SSTF.
- Distinguish SCAN from LOOK, and C-SCAN from C-LOOK.
- Explain how the initial sweep direction changes the service order of every sweep policy.
- Choose a policy for a described workload mix.

## Key terminology

| Term | Meaning |
|------|---------|
| **Seek time** | The time the head spends moving between cylinders — usually the dominant cost of a request. |
| **Total head movement** | The sum of the absolute distances between consecutive services, in cylinders. |
| **Average seek distance** | Total head movement ÷ number of requests served. |
| **Service order** | The sequence in which requests are served under a policy. |
| **Sweep policy** | SCAN, C-SCAN, LOOK or C-LOOK: the head moves steadily in one direction. |

Note that **disk FCFS is not CPU FCFS**: here it means serving the queue in arrival order, which is
perfectly fair and ignores geometry entirely.

## The six policies

| Policy | Rule | Bounds waiting? | Starvation risk | Notes |
|--------|------|:---------------:|:---------------:|-------|
| **FCFS** | Strict arrival order | No | None | Perfectly fair; the head zig-zags, so movement is usually worst |
| **SSTF** | Nearest pending request each time | No | **Yes** | Greedy on distance; can ignore a far request indefinitely |
| **SCAN** | Sweep to the disk edge, reverse | Yes — one sweep | None | The elevator; pays for a trip to the physical end |
| **C-SCAN** | Sweep one way, jump back to the start without servicing | Yes — one sweep | None | Most uniform service; treats the disk as circular |
| **LOOK** | Reverse at the last pending request | Yes — one pass | None | SCAN without the wasted trip to the edge |
| **C-LOOK** | Sweep, then jump to the first pending request on the other side | Yes — one pass | None | C-SCAN without a trip to either end |

**Direction matters.** SCAN, C-SCAN, LOOK and C-LOOK all read an initial direction (up or down), and
changing it changes the service order, the totals, and sometimes which request waits longest. The
adaptive control in the lab lets you flip it and see the difference immediately.

## Worked comparison

The classic queue **98, 183, 37, 122, 14, 124, 65, 67** on a disk of 200 cylinders, starting from head
**53** and sweeping **up**. These totals are what the engines report:

| Policy | Total head movement (cylinders) |
|--------|:-------------------------------:|
| FCFS | 640 |
| SSTF | **236** |
| SCAN | 331 |
| C-SCAN | 382 |
| LOOK | 299 |
| C-LOOK | 322 |

SSTF travels least; FCFS travels most. That is not the whole story — see the SSTF walkthrough below and
the fairness question that follows it.

## Guided lesson

`#/learn/disk-scheduling` — *Reducing mechanical seek time* (Intermediate, ~30 minutes, 6 stages).

**Experiment (stage 3).** Load the queue above in the **Disk Head Scheduling** lab and try all six
policies. You should observe that:

- FCFS travels the furthest; SSTF the least.
- SCAN overshoots to cylinder 199 while LOOK reverses at 183.
- The far request at cylinder **14** is still served by every sweep policy within one pass.

## Walkthrough: total movement by hand (SSTF)

| Step | Working |
|------|---------|
| **Start at 53** | Nearest pending request is **65**, a distance of 12 |
| **Keep taking the nearest** | From 65 the nearest is 67 (2); once there it is **37** (30), not 98 (31) — distance beats direction |
| **Continue** | The order becomes **65, 67, 37, 14, 98, 122, 124, 183** |
| **Sum the distances** | 12 + 2 + 30 + 23 + 84 + 24 + 2 + 59 = **236** cylinders |
| **Compare** | FCFS on the same queue moves **640** cylinders — SSTF saves over 400, but ignores fairness |

Notice the consequence of that order: the head jumps from 14 all the way out to 98 (84 cylinders) and
ends at 183, while the request at 37 was served immediately. Now imagine a request at cylinder 0 that
arrives while a stream of near-head requests keeps appearing: SSTF would never reach it.

## Common mistakes

| Mistake | Correction |
|---------|------------|
| Counting the number of services instead of the distance moved | Cost is total head movement: sum the *gaps* between consecutive cylinders. |
| Assuming the minimum-distance policy is always best | SSTF minimises distance but can starve a far request indefinitely. |
| Confusing SCAN with LOOK | SCAN goes all the way to the edge; LOOK turns around at the last pending request. |
| Forgetting the initial direction | Every sweep policy needs a direction, and it changes the answer. |
| Assuming disk and CPU "FCFS" behave alike | Disk FCFS orders by arrival at the device; CPU FCFS orders by process arrival time. |

## Challenge bank and open challenges

**Bank:** `disk-scheduling` — 12 graded questions reproducible in `#/labs/lab-disk-scheduling`.

Questions ask for total movement under a policy, the average seek distance, the service order, and which
policy behaves a certain way on a described queue.

**Open challenges** (`#/challenges`):

- *Does head direction matter?* — run a sweep policy with both initial directions and explain the
  difference in service order.
- *Starve a request with SSTF* — build an arrival pattern where one far request is never chosen, and
  show which policy would have served it.

## Check yourself

- When would the extra edge travel of SCAN over LOOK actually help?
- What property do all sweep policies share that SSTF lacks?
- Modern SSDs have no moving head — does request reordering still matter, and why?
- Why can the same queue produce a different average seek distance for the same policy when the
  starting direction changes?

## Related

- Previous: [virtual-memory.md](virtual-memory.md) — a page fault is a disk read, so replacement policy
  and disk policy interact.
- Next: [file-systems.md](file-systems.md) — where those blocks live and how they are found.
- Reference: Silberschatz, Galvin & Gagne, *Operating System Concepts*, the mass-storage chapter.
