export interface ReplacementConcept {
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly keyPoints: readonly string[];
}

export const REPLACEMENT_CONCEPT: ReplacementConcept = {
  title: 'Page replacement: choosing a victim',
  paragraphs: [
    'Paging lets a process run from a set of frames smaller than its address space, which means that sooner or later a reference lands on a page that is not resident. That is a **page fault**: the operating system must fetch the page from backing store. If a frame is free it is simply filled; if every frame is occupied then some resident page must be **evicted** to make room.',
    'The choice of victim is the entire policy. A **reference string** — the sequence of page numbers a program touches — exercises the policy: each reference is either a **hit** (the page is resident) or a **fault** (it is not, so a page is loaded and possibly another is evicted). The fault count, hits, hit ratio and fault ratio summarise how well the policy matches the program’s access pattern.',
    '**FIFO** evicts the page that has been resident the longest, which is trivial to implement with a queue but ignores how often a page is used. **LRU** evicts the page that has gone unused the longest, using the recent past as a prediction of the near future; it tracks a recency order. **Optimal (OPT)** evicts the page whose next use lies furthest in the future — and since it needs the whole reference string up front, it is a theoretical lower bound, not a real policy. **Second Chance (Clock)** approximates LRU with one reference bit per frame and a hand that sweeps forward clearing bits, so a recently used page survives one sweep before it becomes a candidate.',
    'Because FIFO is not a **stack algorithm**, adding frames can occasionally *increase* the fault count — **Bélády’s anomaly**. The classic string 1 2 3 4 1 2 5 1 2 3 4 5 faults 9 times over three frames and 10 times over four. LRU and OPT are stack algorithms: the resident set for n frames is always a subset of the resident set for n+1 frames, so more frames can never hurt them.',
    'Real systems rarely implement exact LRU, which needs either hardware support or a large recency structure. They approximate it with Clock, with a working-set window, or with aging counters — trading a little accuracy for a lot of speed. The fault counts in this lab make that trade-off visible.',
  ],
  keyPoints: [
    'A hit means the page is resident; a fault means it is not and a page must be loaded.',
    'FIFO evicts the longest-resident page; LRU the least recently used.',
    'OPT evicts the page needed furthest in the future — the theoretical lower bound.',
    'Second Chance (Clock) approximates LRU with a reference bit and a sweeping hand.',
    'Bélády’s anomaly: FIFO can fault more with more frames; LRU and OPT cannot.',
    'Hit ratio = hits ÷ references; fault ratio = faults ÷ references.',
  ],
};
