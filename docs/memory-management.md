# Memory Management

**Prerequisites:** [Process Management](process-management.md). **Guided lesson:**
`#/learn/memory-management`. **Area page:** `#/topics/memory-management`

Physical memory is finite and processes have different, changing sizes. The allocator's job is to give
each request a place to live — and its choice decides how quickly the free space breaks up into pieces
too small to be useful.

## Why it matters

This area teaches a lesson that generalises far beyond memory: **total capacity is not the number that
matters, contiguity is.** A system can have 900 free units and still refuse an 800-unit request. Once
you can read that from a memory map, you will recognise the same pattern in disk allocation
([file systems](file-systems.md)), in paging ([virtual memory](virtual-memory.md)), and in any pool of
fixed-size resources.

## Learning objectives

- Apply first-fit, best-fit, worst-fit and next-fit placement to an allocation sequence.
- Tell internal fragmentation apart from external fragmentation.
- Explain when a request fails even though total free memory is sufficient.
- Explain what compaction costs and when it is worth it.
- Explain why fixed partitions trade external fragmentation for internal waste.

## Key terminology

| Term | Meaning |
|------|---------|
| **Partition** | A contiguous region of memory assigned to one process. |
| **Hole** | A free block between allocated regions. |
| **First fit** | Take the first hole large enough. |
| **Best fit** | Take the smallest hole that still fits. |
| **Worst fit** | Take the largest hole available. |
| **Next fit** | Resume the search from the last placement, wrapping around. |
| **External fragmentation** | Plenty of total free memory, but scattered in holes too small to use. |
| **Internal fragmentation** | Wasted space trapped inside an allocated partition. |
| **Compaction** | Sliding resident processes together to merge holes into one large block. |

The distinction to keep straight:

```
external fragmentation → free memory that is unusable because it is not contiguous
internal fragmentation → unusable memory that lives inside an allocated block
```

## Fixed partitions vs variable partitions

| | **Fixed partitions** | **Variable partitions** |
|---|---|---|
| When sizes are decided | Once, before any process arrives | On demand, per request |
| Waste type | **Internal** — the unused tail inside a partition | **External** — holes between allocations |
| Can holes be merged? | Not applicable; partitions never change size | Yes — neighbouring holes coalesce on free |
| Growth | A process never grows beyond its partition | A process may need to move to a larger hole |

## Algorithms in this area

| Algorithm | Choice rule | Characteristic |
|-----------|-------------|----------------|
| **First Fit** | First hole large enough | Fast; concentrates fragmentation at the low end of memory |
| **Best Fit** | Smallest hole that fits | Minimises leftover per request, but shreds memory into unusable slivers |
| **Worst Fit** | Largest hole available | Leaves a large remainder, which may still serve a later large request |
| **Next Fit** | First hole found from a roving pointer | Cheaper than first fit; spreads allocations instead of packing the low end |
| **Fixed Partitions** | First free partition large enough | Never splits or merges; internal waste is the fixed price |
| **Buddy Allocator** | Split power-of-two blocks and merge genuine buddies | Internal fragmentation in exchange for very cheap split/coalesce *(planned)* |

Failure matters here: when a placement policy reports failure, it means *no single hole is large
enough*, not that memory is full. That is the definition of external fragmentation in practice.

## Labs

| Lab | Route | Difficulty | Time | What you do |
|-----|-------|------------|------|-------------|
| **Contiguous Allocation & Fragmentation** | `#/labs/lab-contiguous-allocation` | Intermediate | ~25 min | Allocate, free and compact with first/best/worst/next fit |
| **Fixed Partitions & Internal Fragmentation** | `#/labs/lab-fixed-partitions` | Beginner | ~20 min | Pre-divide memory and measure the waste trapped inside partitions |
| **Buddy Allocator** | `#/labs/lab-buddy-system` | Intermediate | ~20 min | *(Planned)* split and coalesce power-of-two blocks |

The contiguous lab ships these presets, which are worth running in order:

| Preset | What it shows |
|--------|---------------|
| *Simple sequence* | The basic allocate/free cycle on a 1000-unit memory |
| *Strategies diverge* | The same requests landing in different places under different policies |
| *External fragmentation* | A request that fails on fragmentation alone, then succeeds after compaction |
| *Coalescing holes* | Three neighbouring processes leave and their holes merge into one |
| *Exact fit* | A freed hole that is exactly the right size for the next request |

## Guided lesson

`#/learn/memory-management` — *Fitting processes into memory* (Intermediate, ~35 minutes, 6 stages).

**Experiment (stage 3).** Switch to **Fixed Partitions**, load *Internal fragmentation* — four
250-unit partitions on a 1000-unit memory — and admit four 200-unit processes. You should observe that:

- Each process occupies a whole 250-unit partition while using only 200.
- The internal-fragmentation metric totals **200** units — 50 per partition.
- No external fragmentation appears, because every partition is exactly accounted for.

## Worked walkthrough: external fragmentation and compaction

This is the *External fragmentation* preset on a 1200-unit memory.

| Step | Result |
|------|--------|
| **Create three holes** | Allocate A(300), X(150), B(300), Y(150), C(300), then free A, B and C — leaving **three 300-unit holes** |
| **Request 800 units** | Total free memory is **900**, but no single hole is large enough, so the request **fails** |
| **Name the problem** | This is external fragmentation: the free space exists but is not contiguous |
| **Compact** | The resident processes slide together and the free space becomes one 900-unit block |
| **Retry** | The same 800-unit request now **succeeds** — at the cost of copying every resident process |

## Common mistakes

| Mistake | Correction |
|---------|------------|
| Using total free memory to decide whether a request fits | What matters is the **largest single hole**, not the sum of all holes. |
| Confusing the two fragmentation types | Internal waste lives inside a used partition; external waste is unusable space between partitions. |
| Assuming more free memory always helps | More scattered free memory can be less useful than one contiguous run. |
| Thinking best fit is always best | It minimises the leftover for *this* request and tends to create the smallest, least reusable holes. |
| Forgetting compaction's cost | Compaction copies every resident process and updates every pointer to it. |

## Challenge banks and open challenges

**Banks** (10 graded questions total):

| Bank | Questions | Lab |
|------|:---------:|-----|
| `placement` | 5 | `#/labs/lab-contiguous-allocation` |
| `fragmentation` | 5 | `#/labs/lab-contiguous-allocation` |

Questions ask for the address a process lands at under a given policy, the largest hole after a
sequence, and totals of free and wasted memory — all read out of the memory engine.

**Open challenges** (`#/challenges`):

- *Prove external fragmentation* — construct a sequence where a request fails despite total free memory
  being sufficient, then repair it with compaction.
- *Measure buddy allocator waste* — for a workload of requests, compute the internal fragmentation a
  power-of-two allocator would incur.

## Check yourself

- Why do real kernels often allocate in power-of-two blocks?
- When is compaction worth the copying cost, and when is it not?
- Which placement policy would you choose for a long-running server, and why?
- Fixed partitions never suffer external fragmentation. What do they suffer instead, and how is it
  measured?

## Related

- Previous: [deadlocks.md](deadlocks.md) — resources that must be released rather than taken.
- Next: [virtual-memory.md](virtual-memory.md) — paging removes external fragmentation by abandoning
  contiguity altogether.
- Reference: Silberschatz, Galvin & Gagne, *Operating System Concepts*, the main-memory chapter.
