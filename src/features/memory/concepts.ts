export type MemoryConceptKind = 'contiguous' | 'fixed';

export interface MemoryConcept {
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly keyPoints: readonly string[];
}

export const MEMORY_CONCEPTS: Record<MemoryConceptKind, MemoryConcept> = {
  contiguous: {
    title: 'Contiguous allocation, holes and fragmentation',
    paragraphs: [
      'Contiguous allocation gives each process one uninterrupted run of physical memory. With **variable partitions** memory starts as a single hole; the kernel carves each allocation out of a hole big enough to hold it, and when a process leaves its region becomes a hole again. Two neighbouring holes are merged — coalesced — the moment they touch.',
      'That is what makes placement a policy problem. When several holes are large enough, which one should the request take? **First fit** takes the first that works, which is fast and keeps large holes intact at the high end. **Best fit** takes the smallest that works, minimising this request’s leftover but shredding memory into tiny unusable fragments. **Worst fit** takes the largest, leaving a big remainder that may still serve a later large request. **Next fit** keeps a roving pointer and resumes where it left off, so allocations spread out instead of always packing the low end.',
      'The enemy is **external fragmentation**: free memory exists, but it is scattered across holes too small to satisfy a request. A request can therefore fail even when total free memory is more than enough. The usual measurement is total free bytes minus the largest single hole — the amount that is free but not usable as one contiguous block.',
      'Two remedies appear in the lab. **Compaction** slides every resident process to the low end so all free memory becomes one hole; it is effective but costs time, because each moved process must be copied and every pointer to it updated. **Fixed partitioning** attacks the problem from the other side — see the other lab.',
      'Fragmentation has a second face. **Contiguous** allocation suffers external fragmentation because processes have different sizes and leave ragged holes. Reducing it with fixed-size partitions trades it for **internal fragmentation**, where memory is reserved inside a partition but unused.',
    ],
    keyPoints: [
      'A hole is a free run; neighbouring holes coalesce automatically.',
      'First fit: fastest, keeps large holes at the high end.',
      'Best fit: smallest leftover per request, but tiny scattered holes.',
      'Worst fit: leaves the largest remainder.',
      'Next fit: roving pointer, spreads allocations across memory.',
      'External fragmentation is free memory that is not usable as one block.',
      'Compaction removes external fragmentation at the cost of moving processes.',
    ],
  },
  fixed: {
    title: 'Fixed partitions and internal fragmentation',
    paragraphs: [
      'In **fixed partitioning** the kernel divides memory into a set of blocks once, before any process arrives. Every block keeps its size forever. A process is placed into a partition large enough to hold it, and it occupies that whole partition even if it needs only part of it.',
      'The unused tail is **internal fragmentation**: memory that is reserved for the process but never used. With four 250-unit partitions each holding a 200-unit process, 50 units per partition — 200 in total — are wasted. Making partitions smaller reduces the waste but eventually forces large requests to wait for a partition that is never big enough.',
      'Fixed partitioning has no external fragmentation, because every partition is a permanent, exactly-sized slot and freed partitions are never merged. Instead, the cost shows up as processes that cannot be admitted while unused space sits inside other partitions.',
      'The trade-off is the classic one between simplicity and utilisation. Fixed partitions make allocation a fast lookup over a fixed table and bound the time an allocation can take; variable partitions use memory more tightly but need splitting, coalescing and, sometimes, compaction.',
    ],
    keyPoints: [
      'Partitions are defined once and never change size.',
      'A process occupies a whole partition, so the unused tail is internal fragmentation.',
      'Internal waste = partition size − process size, summed over allocated partitions.',
      'Freed partitions are not merged and never re-sized.',
      'No external fragmentation, but a request may wait while space sits unused.',
    ],
  },
};
