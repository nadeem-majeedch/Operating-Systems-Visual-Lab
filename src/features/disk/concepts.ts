export interface DiskConcept {
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly keyPoints: readonly string[];
}

export const DISK_CONCEPT: DiskConcept = {
  title: 'Disk head scheduling: turning request order into head movement',
  paragraphs: [
    'A magnetic disk stores data on concentric rings called **cylinders**. Reading or writing a block costs a **seek** — moving the read/write head from its current cylinder to the target cylinder — plus a rotational delay and the transfer itself. Seek time dominates, and it is proportional to the distance travelled, so **how the queue of pending requests is ordered changes performance directly**. Disk scheduling is the policy that decides that order.',
    'The **request queue** is the list of cylinders waiting to be served, and the **disk size** sets the range `0 … N−1`. The head starts at some **initial cylinder** and, for the sweep policies, an initial **direction**. Each policy produces a **service order** and a **total head movement**: the sum of the distances between consecutive cylinders visited. Dividing by the number of requests gives the **average seek distance**.',
    '**FCFS** services the queue in strict arrival order. It is perfectly fair — no request is ever overtaken — but blind to distance, so the head oscillates and total movement is usually the worst of the six. **SSTF** always serves the request nearest the head. It sharply reduces total movement, but because a stream of nearby arrivals keeps being chosen first, a far-away request can be **starved** indefinitely.',
    'The four sweep policies fix that. **SCAN**, the elevator algorithm, moves steadily in one direction servicing requests as it passes them, travels all the way to the physical end of the disk, then reverses. **LOOK** is SCAN without the wasted trip: it reverses at the last pending request in the direction instead of the edge. **C-SCAN** sweeps in one direction only, then races back to the start without servicing anything, so every request waits at most one sweep — the most uniform service. **C-LOOK** is C-SCAN without the trip to the edge: it jumps straight from the last request of a sweep to the first pending request on the other side.',
    'There is a genuine trade-off here. SSTF minimises the distance the head travels but offers no fairness guarantee; FCFS is perfectly fair but slow; the sweep policies bound waiting time at the cost of some extra movement. LOOK and C-LOOK usually beat SCAN and C-SCAN on total distance because they never visit a cylinder that holds no request — the physical edge trip is pure overhead unless requests await there.',
  ],
  keyPoints: [
    'Seek time dominates disk access, and it grows with the distance the head moves.',
    'Total head movement is the sum of consecutive hops; average seek distance divides it by the request count.',
    'FCFS is fair but blind to distance; SSTF is greedy and can starve far requests.',
    'SCAN sweeps to the disk edge; LOOK reverses at the last request.',
    'C-SCAN and C-LOOK sweep one way only, giving the most uniform wait times.',
    'Reading the direction matters only for the four sweep policies.',
  ],
};
