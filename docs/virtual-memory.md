# Virtual Memory

**Prerequisites:** [Memory Management](memory-management.md). **Guided lesson:**
`#/learn/virtual-memory`. **Area page:** `#/topics/virtual-memory`

Paging abandons the constraint that caused all the trouble in the previous area: that a process needs
one contiguous region. Instead, memory is chopped into fixed-size blocks and any block can live
anywhere, so a process larger than any single hole can still run.

## Why it matters

This is where the address you see stops being the address the hardware uses. Two ideas follow from it:
**translation** (how a logical address becomes a physical one) and **replacement** (what happens when
there is no free frame). Nearly every performance number in a real operating system — the cost of a
context switch, the value of a cache, the point of locality — comes back to how often a translation
misses and how often a page has to be fetched from disk.

## Learning objectives

- Split a logical address into a page number and an offset.
- Translate a page number to a frame through the page table, with the TLB in front of it.
- Distinguish a TLB hit, a TLB miss, a page fault and an invalid address.
- Simulate FIFO, LRU, OPT and Second Chance (Clock) page replacement over a reference string.
- Explain why OPT is a theoretical bound rather than an implementable policy.
- Identify Bélády's anomaly in a FIFO run, and say why LRU and OPT do not suffer it.

## Key terminology

| Term | Meaning |
|------|---------|
| **Page** | A fixed-size block of a virtual (logical) address space. |
| **Frame** | A same-sized block of physical memory that holds one page. |
| **Page table** | The per-process map from page number to frame, with a valid (present) bit. |
| **TLB** | A small hardware cache of recent page-to-frame translations. |
| **TLB hit / miss** | The translation was / was not cached. A miss is slower, not an error. |
| **Page fault** | A reference to a page that is not currently in memory, which the OS must load. |
| **Invalid address** | An address larger than the logical address space — a protection fault, not a page fault. |
| **Reference string** | The sequence of page numbers a program touches. |
| **Bélády's anomaly** | FIFO occasionally faults *more* with *more* frames. |

### Address translation in four lines

```
offsetBits = log2(pageSize)
pageNumber = logicalAddress >> offsetBits
offset     = logicalAddress & (pageSize - 1)
physical   = (frame << offsetBits) | offset
```

Only the page number is translated. The offset is copied through unchanged — that is why a page and
its frame must be the same size.

### What happens on a reference

| Outcome | What it means | Relative cost |
|---------|---------------|---------------|
| **TLB hit** | The page → frame mapping was cached | Fastest |
| **TLB miss** | Not cached; walk the page table, then cache the result | One extra page-table access |
| **Page fault** | The page's valid bit is clear: it is not in memory | Orders of magnitude slower — it touches the backing store |
| **Protection fault** | The address cannot exist in this address space | Trapped before any translation |

## Replacement algorithms

| Policy | Victim rule | Online? | Optimal? | Notes |
|--------|-------------|:-------:|:--------:|-------|
| **FIFO** | Longest-resident page | Yes | No | Trivial to implement; ignores how often a page is used |
| **LRU** | Least recently used page | Yes | No | Uses the recent past as a predictor of the near future |
| **OPT** | Page whose next use is furthest in the future | **No** | **Yes** | Needs the whole reference string up front — a measuring stick, not a policy |
| **Second Chance (Clock)** | FIFO plus one reference bit per frame and a sweeping hand | Yes | No | Cheap approximation of LRU; a page used recently survives one sweep |

Fault counts for the classic string `7 0 1 2 0 3 0 4 2 3 0 3` over **three frames**, as reported by the
engines in this lab:

| Policy | Faults | Hits |
|--------|:------:|:----:|
| FIFO | 10 | 2 |
| LRU | 9 | 3 |
| Second Chance (Clock) | 9 | 3 |
| OPT | **7** | 5 |

OPT faults the fewest, as it must; Clock matches LRU here without needing a full recency order.

**Stack algorithms.** LRU and OPT are *stack algorithms*: the set of resident pages for *n* frames is
always a subset of the resident set for *n + 1* frames, so adding memory can never increase faults.
FIFO is not a stack algorithm, which is exactly why Bélády's anomaly is possible. On the string
`1 2 3 4 1 2 5 1 2 3 4 5`, FIFO faults **9** times over three frames and **10** times over four —
more memory, more faults.

## Labs

| Lab | Route | Difficulty | Time | What you do |
|-----|-------|------------|------|-------------|
| **Paging, Address Translation & the TLB** | `#/labs/lab-tlb-translation` | Advanced | ~30 min | Split addresses, hit or miss in the TLB, walk the page table, fault a page in, form the physical address |
| **Page Replacement** | `#/labs/lab-page-replacement` | Intermediate | ~35 min | Replay a reference string and compare FIFO, LRU, OPT and Clock, including Bélády's anomaly |

The page-replacement lab ships presets that isolate each behaviour: a *basic string* where the four
policies disagree, a *Bélády's anomaly* preset where four frames fault more than three, an
*LRU exploits locality* preset on the same string, an *optimal bound* preset, and a *Second Chance*
preset.

## Guided lesson

`#/learn/virtual-memory` — *Pretending memory is bigger than it is* (Advanced, ~45 minutes, 6 stages).

**Experiment (stage 3).** In the **Page Replacement** lab, replay `7 0 1 2 0 3 0 4 2 3 0 3` over **three
frames** under FIFO, then LRU, OPT and Clock. You should observe that:

- OPT faults the least — it is the theoretical lower bound.
- Each fault names the victim and the reason it was chosen.
- Switching to the anomalous string makes FIFO fault more with four frames than with three.

## Worked walkthrough: follow one address

Tracing the value **100** with **64-byte pages**:

| Step | Result |
|------|--------|
| **Split the address** | page ⌊100 / 64⌋ = **1**, offset 100 − 64 = **36** |
| **Look in the TLB** | If page 1 is cached, take the frame immediately; otherwise walk the page table |
| **Walk the page table** | The entry for page 1 gives the frame number, and the valid bit says whether it is resident |
| **Handle a fault** | If valid is 0, the OS loads the page into a free frame (or evicts a victim) and restarts the instruction |
| **Recombine** | physical = frame × 64 + 36 — **the offset never changed** |

## Common mistakes

| Mistake | Correction |
|---------|------------|
| Treating a TLB miss as a page fault | A TLB miss just walks the page table; a page fault means the page is not in memory at all. |
| Thinking the offset changes during translation | Only the page number is translated; the offset is copied through unchanged. |
| Assuming more frames always means fewer faults | That holds for the stack algorithms (LRU, OPT), but not for FIFO. |
| Thinking OPT is implementable | OPT needs to know future references; it exists to bound how good a real policy is. |
| Believing a page fault is an error | It is the normal mechanism that brings a page in from backing store. |

## Challenge banks and open challenges

**Banks** (25 graded questions total — the largest area in the lab):

| Bank | Questions | Lab |
|------|:---------:|-----|
| `address-translation` | 7 | `#/labs/lab-tlb-translation` |
| `tlb` | 4 | `#/labs/lab-tlb-translation` |
| `page-faults` | 2 | `#/labs/lab-tlb-translation` |
| `page-replacement` | 12 | `#/labs/lab-page-replacement` |

Geometry questions (page size, number of pages, offset width) are computed from the address maths; TLB,
fault and replacement answers are read out of the engine run.

**Open challenges** (`#/challenges`):

- *Reproduce Bélády's anomaly* — find a reference string and frame counts where FIFO faults more with
  more frames, and explain why LRU does not.
- *Cost a TLB miss* — given a hit rate and access costs, compute the effective access time and say what
  would improve it.

## Check yourself

- Why does a TLB hit rate matter so much for overall performance?
- Why can OPT never be implemented in a real system?
- Explain Bélády's anomaly to a classmate using the *frame contents*, not just the fault counts.
- Why is a page fault so much more expensive than a TLB miss?
- What is the difference between an address that is invalid and one whose page is simply not resident?

## Related

- Previous: [memory-management.md](memory-management.md) — the external fragmentation that paging
  removes.
- Next: [disk-scheduling.md](disk-scheduling.md) — the device that serves a page fault.
- Reference: Silberschatz, Galvin & Gagne, *Operating System Concepts*, the virtual-memory chapter;
  Arpaci-Dusseau, *Operating Systems: Three Easy Pieces*, the memory chapters.
