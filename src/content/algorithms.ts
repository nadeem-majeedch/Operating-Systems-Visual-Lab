import type { Algorithm } from '@/types';

/**
 * The catalogue of operating-system algorithms the lab teaches.
 *
 * This file is pure content: it describes *what* an algorithm is and which
 * knobs a learner can turn. Whether a simulator exists is tracked by
 * `status` here and by `src/engine/registry.ts`.
 */
export const ALGORITHMS: readonly Algorithm[] = [
  /* ---------------------------------------------------------------- CPU ---- */
  {
    id: 'fcfs',
    name: 'First Come, First Served',
    abbreviation: 'FCFS',
    topicId: 'cpu-scheduling',
    summary: 'Run processes strictly in arrival order until each one finishes.',
    description:
      'FCFS keeps a single ready queue and always dispatches its head. It is the simplest non-preemptive policy, it never starves a process, and its waiting times swing wildly with the arrival pattern (the convoy effect).',
    difficulty: 'beginner',
    status: 'available',
    /** FCFS has no policy knobs: order of arrival is the whole policy. */
    parameters: [],
    properties: {
      timeComplexity: 'O(n log n) to sort arrivals',
      spaceComplexity: 'O(n)',
      optimal: false,
      preemptive: false,
      online: true,
    },
    tags: ['non-preemptive', 'queue', 'convoy effect'],
    pseudocode: `sort processes by arrival time

for each process p in arrival order:
    if p.arrival > clock:            // the CPU has nothing to run
        record an idle gap from clock to p.arrival
        clock = p.arrival

    start = clock
    clock = clock + p.burst          // runs to completion, never preempted

    record completion = clock
           turnaround = completion - p.arrival
           waiting    = turnaround - p.burst`,
  },
  {
    id: 'sjf',
    name: 'Shortest Job First',
    abbreviation: 'SJF',
    topicId: 'cpu-scheduling',
    summary: 'Among ready processes, pick the one with the smallest burst time.',
    description:
      'SJF is provably optimal for average waiting time when all jobs arrive together, but it needs burst-time knowledge the OS rarely has. Long jobs can starve.',
    difficulty: 'intermediate',
    status: 'available',
    parameters: [],
    properties: {
      timeComplexity: 'O(n log n) with a priority queue',
      spaceComplexity: 'O(n)',
      optimal: true,
      preemptive: false,
      online: false,
    },
    tags: ['non-preemptive', 'optimal', 'starvation'],
    pseudocode: `while unfinished processes remain:
    ready = processes that have arrived and are unfinished

    if ready is empty:
        clock = earliest arrival of an unfinished process   // idle
        continue

    p = ready with the smallest burst time
        // ties broken by arrival time, then by name

    start = clock
    clock = clock + p.burst          // still non-preemptive
    record completion, turnaround, waiting for p`,
  },
  {
    id: 'srtf',
    name: 'Shortest Remaining Time First',
    abbreviation: 'SRTF',
    topicId: 'cpu-scheduling',
    summary: 'The preemptive form of SJF: preempt whenever a shorter job arrives.',
    description:
      'SRTF always runs the process with the least remaining work. It reduces average waiting time further but pays with frequent context switches and more bookkeeping.',
    difficulty: 'advanced',
    status: 'available',
    parameters: [],
    properties: { preemptive: true, optimal: true, online: false },
    tags: ['preemptive', 'optimal'],
    pseudocode: `while unfinished processes remain:
    if nothing has arrived yet:
        clock = earliest arrival

    p = unfinished process with the smallest REMAINING time

    run p until the earlier of:
        p finishes                          -> record completion
        a newly arriving process has less    -> preempt p, requeue it
            remaining time than p

The preempted process keeps its remaining time and returns to the queue.`,
  },
  {
    id: 'round-robin',
    name: 'Round Robin',
    abbreviation: 'RR',
    topicId: 'cpu-scheduling',
    summary: 'Give every process a fixed time quantum, then rotate to the back of the queue.',
    description:
      'Round Robin is designed for time-sharing. A small quantum improves responsiveness at the cost of more context switches; a quantum larger than every burst degenerates to FCFS.',
    difficulty: 'intermediate',
    status: 'available',
    parameters: [
      {
        id: 'quantum',
        name: 'Time quantum',
        description: 'CPU time granted per turn.',
        kind: 'number',
        defaultValue: 4,
        min: 1,
        max: 20,
        step: 1,
      },
    ],
    properties: { preemptive: true, optimal: false, online: true },
    tags: ['preemptive', 'time-sharing', 'quantum'],
    pseudocode: `sort processes by arrival time
clock = earliest arrival
ready = empty queue

loop:
    if ready is empty:
        clock = next arrival            // record an idle gap if clock moved
    add every process with arrival <= clock to ready

    p = ready.dequeue()
    slice = min(quantum, p.remaining)

    record a segment [clock, clock + slice) for p
    clock = clock + slice
    p.remaining = p.remaining - slice

    if p.remaining > 0:
        ready.enqueue(p)                // back of the queue
    else:
        record completion of p
until every process has completed`,
  },
  {
    id: 'priority-scheduling',
    name: 'Priority Scheduling',
    abbreviation: 'PRIO',
    topicId: 'cpu-scheduling',
    summary: 'Always run the ready process with the highest priority.',
    description:
      'Priority scheduling lets the system express urgency, optionally with aging to prevent indefinite starvation of low-priority work.',
    difficulty: 'intermediate',
    status: 'available',
    parameters: [],
    properties: { preemptive: false, optimal: false, online: true },
    tags: ['priority', 'aging', 'starvation'],
    pseudocode: `while unfinished processes remain:
    ready = processes that have arrived and are unfinished
    p = ready with the highest priority      // lowest number wins
        // ties broken by arrival time, then by name

    run p to completion (non-preemptive variant)

    optionally raise the priority of every waiting process
    by 1 every N time units so old jobs cannot starve`,
  },
  {
    id: 'priority-preemptive',
    name: 'Preemptive Priority Scheduling',
    abbreviation: 'PRIO-P',
    topicId: 'cpu-scheduling',
    summary: 'Preempt the running process the moment a higher-priority one arrives.',
    description:
      'The preemptive variant re-evaluates the CPU on every arrival, so the most urgent ready process always holds it. Response time for high-priority work improves at the cost of more context switches and a stronger starvation risk.',
    difficulty: 'advanced',
    status: 'available',
    parameters: [],
    properties: { preemptive: true, optimal: false, online: true },
    tags: ['priority', 'preemptive', 'starvation'],
    pseudocode: `while unfinished processes remain:
    if nothing is ready:
        clock = earliest arrival of an unfinished process

    p = ready process with the highest priority   // lowest number wins

    if p is not the running process:
        save the running process's remaining time
        preempt it and dispatch p                 // a context switch

    run p until the earlier of:
        p finishes                            -> record completion
        a higher-priority process arrives      -> preempt p

; no aging means low-priority work can starve`,
  },

  /* ------------------------------------------------------- Process mgmt ---- */
  {
    id: 'process-state-machine',
    name: 'Process State Machine',
    topicId: 'process-management',
    summary: 'Trace new → ready → running → waiting → terminated transitions.',
    description:
      'A process is always in exactly one state. Every transition costs bookkeeping in the PCB, and preemption adds the running → ready path back into the mix.',
    difficulty: 'beginner',
    status: 'available',
    parameters: [],
    properties: { timeComplexity: 'O(1) per transition', spaceComplexity: 'O(n) PCBs' },
    tags: ['pcb', 'lifecycle', 'context switch'],
    pseudocode: `create(name, priority) -> PCB in NEW

legal transitions:
    NEW       --admit-->     READY
    READY     --dispatch-->  RUNNING
    RUNNING   --preempt-->   READY
    RUNNING   --block-->     WAITING
    WAITING   --unblock-->   READY
    RUNNING   --terminate--> TERMINATED

on every transition:
    record the outgoing state in the PCB
    update the PCB (state, cpuTime, waitingTime, completionTime)
    if the CPU changes hands between two processes:
        save the old context, restore the new one
        contextSwitches = contextSwitches + 1

invariant: at most one process is RUNNING at a time`,
  },
  {
    id: 'fork-exec',
    name: 'fork / exec',
    topicId: 'process-management',
    summary: 'See how a process duplicates itself and replaces its image.',
    description:
      'fork creates a child that shares program text but not address space; exec overwrites the calling process image while keeping the same PID.',
    difficulty: 'intermediate',
    status: 'planned',
    parameters: [],
    properties: {},
    tags: ['unix', 'ipc'],
  },

  /* --------------------------------------------------- Synchronization ---- */
  {
    id: 'mutex',
    name: 'Mutex Lock',
    topicId: 'synchronization',
    summary: 'Mutual exclusion with a binary lock around a critical section.',
    description:
      'A mutex guarantees at most one thread inside the critical section, but correctness still depends on the programmer pairing lock and unlock on every path.',
    difficulty: 'beginner',
    status: 'available',
    parameters: [],
    properties: {},
    tags: ['critical section', 'mutual exclusion'],
    pseudocode: `lock(mutex):
    while mutex.held:
        put this thread on mutex.waitQueue and block
    mutex.held = true

unlock(mutex):
    mutex.held = false
    if mutex.waitQueue is not empty:
        wake one waiting thread

; used as:
lock(m)
    critical section          // at most one thread inside
unlock(m)`,
  },
  {
    id: 'semaphore',
    name: 'Counting Semaphore',
    topicId: 'synchronization',
    summary: 'Model producers and consumers with wait() and signal().',
    description:
      'A semaphore counts available resources. Signal before wait and orderings invert; swap the operations and you get a deadlock.',
    difficulty: 'intermediate',
    status: 'available',
    parameters: [],
    properties: {},
    tags: ['producer consumer', 'bounded buffer'],
    pseudocode: `semaphore empty = n, full = 0, mutex = 1

producer:                      consumer:
    produce(item)                  wait(full)
    wait(empty)                    wait(mutex)
    wait(mutex)                    item = buffer.take()
    buffer.put(item)               signal(mutex)
    signal(mutex)                  signal(empty)
    signal(full)                   consume(item)

wait(S):  S -= 1; if S < 0 then block this thread on S
signal(S): S += 1; if S <= 0 then wake one thread from S`,
  },
  {
    id: 'bounded-buffer',
    name: 'Bounded Buffer',
    topicId: 'synchronization',
    summary: 'Step through the classic producer/consumer lock-step schedule.',
    description:
      'The bounded buffer is the canonical synchronisation problem: a full buffer blocks producers, an empty buffer blocks consumers, and both need mutual exclusion on the shared array.',
    difficulty: 'intermediate',
    status: 'available',
    parameters: [],
    properties: {},
    tags: ['producer consumer', 'classic problem'],
    pseudocode: `semaphore empty = capacity, full = 0, mutex = 1

producer:                          consumer:
    wait(empty)                        wait(full)
    wait(mutex)                        wait(mutex)
    put item into buffer               item = take from buffer
    signal(mutex)                      signal(mutex)
    signal(full)                       signal(empty)

; empty + full == capacity at all times
; wait() blocks the caller instead of spinning
; swapping the order of the two waits deadlocks`,
  },
  {
    id: 'dining-philosophers',
    name: 'Dining Philosophers',
    topicId: 'synchronization',
    summary: 'Five philosophers, five forks, and the ordering that avoids deadlock.',
    description:
      'Each philosopher needs both neighbouring forks to eat. When everyone grabs the left fork first, the circular wait closes and the table deadlocks; reordering one philosopher’s picks or limiting seats to n − 1 restores progress.',
    difficulty: 'intermediate',
    status: 'available',
    parameters: [],
    properties: {},
    tags: ['deadlock', 'resource ordering', 'classic problem'],
    pseudocode: `philosopher(i):
    loop:
        think()
        wait(fork[i])              // left
        wait(fork[(i + 1) % n])    // right

        eat()

        signal(fork[i])
        signal(fork[(i + 1) % n])

; naive order deadlocks: every philosopher holds a left fork
; and waits forever for a right one -> circular wait
;
; fixes:
;   ordered  - the last philosopher takes the right fork first
;   waiter   - allow at most n - 1 philosophers at the table`,
  },
  {
    id: 'readers-writers',
    name: 'Readers / Writers',
    topicId: 'synchronization',
    summary: 'Many concurrent readers, one exclusive writer.',
    description:
      'Readers may share the data but writers need it to themselves. A read count guarded by a mutex lets the first reader lock out writers and the last one release them — which also shows how a steady stream of readers can starve a writer.',
    difficulty: 'intermediate',
    status: 'available',
    parameters: [],
    properties: {},
    tags: ['reader writer', 'shared data', 'starvation'],
    pseudocode: `reader:                            writer:
    wait(mutex)                        wait(writeLock)
    readCount += 1                     write()
    if readCount == 1:                 signal(writeLock)
        wait(writeLock)
    signal(mutex)
    read()                             ; readers share the data,
    wait(mutex)                        ; writers exclude everyone
    readCount -= 1
    if readCount == 0:
        signal(writeLock)
    signal(mutex)

; readers preference can starve writers`,
  },

  /* ---------------------------------------------------------- Deadlocks ---- */
  {
    id: 'bankers-algorithm',
    name: "Banker's Algorithm",
    topicId: 'deadlocks',
    summary: 'Decide whether granting a request keeps the system in a safe state.',
    description:
      'Banker\'s algorithm simulates the worst case: a request is granted only if a safe sequence still exists for every process.',
    difficulty: 'advanced',
    status: 'available',
    parameters: [],
    properties: { timeComplexity: 'O(n² · m)', spaceComplexity: 'O(n · m)' },
    tags: ['avoidance', 'safe state'],
    pseudocode: `request(P, R):
    if R > P.need:        reject   // a process must declare its maximum up front
    if R > available:     make P wait

    tentatively allocate:  available -= R
                           P.allocation += R
                           P.need -= R

    if safe():  grant the request
    else:       roll the allocation back and make P wait

safe():
    work = available
    repeat:
        find P with not finished[P] and need[P] <= work
        if none: break
        work += allocation[P]
        finished[P] = true          // P joins the safe sequence
    return every process finished`,
  },
  {
    id: 'wait-for-graph',
    name: 'Wait-for Graph Detection',
    topicId: 'deadlocks',
    summary: 'Detect deadlock by looking for a cycle in the resource graph.',
    description:
      'A cycle in the wait-for graph is a necessary and sufficient condition for deadlock in single-instance resources. Multi-instance resources need the reduction algorithm instead.',
    difficulty: 'intermediate',
    status: 'available',
    parameters: [],
    properties: {},
    tags: ['detection', 'cycle'],
    pseudocode: `; one instance per resource type
build wait-for graph W:
    for each resource r held by P that Q is waiting for:
        add edge P -> Q

deadlock  <=>  W contains a cycle

; multiple instances per resource type: reduction
work = available
finish[i] = (request[i] == 0) for every process i
repeat:
    find i with not finish[i] and request[i] <= work
    if none: break
    work += allocation[i]
    finish[i] = true

deadlocked = every process i with finish[i] == false`,
  },

  /* --------------------------------------------------- Memory management ---- */
  {
    id: 'first-fit',
    name: 'First Fit',
    topicId: 'memory-management',
    summary: 'Allocate the first hole large enough for the request.',
    description:
      'First fit is fast and good enough in practice; it concentrates fragmentation at the low end of memory.',
    difficulty: 'beginner',
    status: 'available',
    parameters: [],
    properties: {},
    tags: ['contiguous allocation', 'fragmentation'],
    pseudocode: `firstFit(request size s):
    for each hole h in address order:
        if h.size >= s:
            place the process at the start of h
            h.start += s
            h.size  -= s
            return success
    return failure          // no single hole is large enough

; failure here means external fragmentation, not a full memory`,
  },
  {
    id: 'best-fit',
    name: 'Best Fit',
    topicId: 'memory-management',
    summary: 'Allocate the smallest hole that still fits.',
    description:
      'Best fit minimises leftover space per request but tends to create a trail of unusably small holes.',
    difficulty: 'intermediate',
    status: 'available',
    parameters: [],
    properties: {},
    tags: ['contiguous allocation', 'external fragmentation'],
    pseudocode: `bestFit(request size s):
    candidate = the hole with the smallest size >= s
               // ties broken by address order
    if no candidate: return failure

    place the process in candidate
    candidate.size -= s

; smallest leftover per request, but it shreds memory into
; many holes that are too small to use`,
  },
  {
    id: 'worst-fit',
    name: 'Worst Fit',
    topicId: 'memory-management',
    summary: 'Allocate the largest hole available.',
    description:
      'Worst fit always carves into the biggest hole, hoping the large remainder is still useful for later requests. It spreads allocations out but leaves a trail of medium holes.',
    difficulty: 'intermediate',
    status: 'available',
    parameters: [],
    properties: {},
    tags: ['contiguous allocation', 'external fragmentation'],
    pseudocode: `worstFit(request size s):
    candidate = the hole with the largest size >= s
               // ties broken by address order
    if no candidate: return failure

    place the process in candidate
    candidate.size -= s

; the biggest remainder is left for the next request, but
; every hole is nibbled down and none stays large forever`,
  },
  {
    id: 'next-fit',
    name: 'Next Fit',
    topicId: 'memory-management',
    summary: 'Resume the search from the last placement and wrap around.',
    description:
      'Next fit keeps a roving pointer instead of restarting at address 0, so allocations spread across memory rather than clustering at the low end.',
    difficulty: 'intermediate',
    status: 'available',
    parameters: [],
    properties: {},
    tags: ['contiguous allocation', 'roving pointer'],
    pseudocode: `nextFit(request size s):
    start the scan at nextPointer, searching in address order
    wrap around to the low end if the scan reaches the top

    candidate = the first hole found with size >= s
    if no candidate: return failure

    place the process in candidate
    nextPointer = address just after the new allocation

; cheaper than first fit because it never rescans the low holes,
; but it can fragment the high end faster`,
  },
  {
    id: 'fixed-partitions',
    name: 'Fixed Partitions',
    topicId: 'memory-management',
    summary: 'Pre-divide memory into fixed blocks and accept internal waste.',
    description:
      'Fixed partitioning splits memory once. A process occupies a whole partition even when it is smaller, so the leftover tail is internal fragmentation that no other process can use.',
    difficulty: 'beginner',
    status: 'available',
    parameters: [],
    properties: {},
    tags: ['fixed partitioning', 'internal fragmentation'],
    pseudocode: `partitions = a fixed list of block sizes summing to memory

allocate(request size s):
    for each free partition p in address order:
        if p.size >= s:
            mark p used by this process
            internal waste = p.size - s
            return success
    return failure          // the process waits for a partition

free(process):
    mark the process's partition free again
    // its size never changes and neighbours are never merged

; internal fragmentation is the price of never having to split
; or merge, and of a bound on how long an allocation can take`,
  },
  {
    id: 'buddy-system',
    name: 'Buddy Allocator',
    topicId: 'memory-management',
    summary: 'Split and merge power-of-two blocks.',
    description:
      'The buddy system trades internal fragmentation for very cheap split/coalesce operations, which is why kernels use it for page-sized allocations.',
    difficulty: 'intermediate',
    status: 'planned',
    parameters: [],
    properties: {},
    tags: ['paging', 'coalescing'],
  },

  /* ---------------------------------------------------- Virtual memory ---- */
  {
    id: 'fifo-page',
    name: 'FIFO Page Replacement',
    topicId: 'virtual-memory',
    summary: 'Evict the page that has been resident the longest.',
    description:
      'FIFO is trivial to implement but suffers Bélády\'s anomaly: adding frames can increase the number of page faults.',
    difficulty: 'intermediate',
    status: 'available',
    parameters: [],
    properties: { optimal: false, online: true },
    tags: ['page replacement', 'belady anomaly'],
    pseudocode: `queue = FIFO of resident page numbers

for each reference r:
    if r is in a frame:
        hit
    else:
        fault
        if every frame is occupied:
            victim = queue.dequeue()      // the longest-resident page
            evict victim
        load r into a free frame
        queue.enqueue(r)

; FIFO ignores how often a page is used, which is why Bélády's
; anomaly (more frames, more faults) is possible`,
  },
  {
    id: 'lru-page',
    name: 'LRU Page Replacement',
    topicId: 'virtual-memory',
    summary: 'Evict the page that has gone unused the longest.',
    description:
      'LRU approximates the optimal policy using recent history as a predictor, but exact LRU needs hardware support or an O(1) approximation such as a clock.',
    difficulty: 'intermediate',
    status: 'available',
    parameters: [],
    properties: { optimal: false, online: true },
    tags: ['page replacement', 'locality'],
    pseudocode: `frames ordered from least to most recently used

for each reference r:
    if r is in a frame:
        hit
        move r to the most-recently-used end
    else:
        fault
        if every frame is occupied:
            evict the page at the least-recently-used end
        load r and place it at the most-recently-used end`,
  },
  {
    id: 'optimal-page',
    name: 'Optimal Page Replacement',
    topicId: 'virtual-memory',
    summary: 'Evict the page whose next use is furthest in the future.',
    description:
      'OPT gives the lowest possible fault rate, which makes it a perfect yardstick for measuring how close a real policy gets.',
    difficulty: 'advanced',
    status: 'available',
    parameters: [],
    properties: { optimal: true, online: false },
    tags: ['page replacement', 'lower bound'],
    pseudocode: `for each reference r at position t in the string:
    if r is in a frame:
        hit
    else:
        fault
        if every frame is occupied:
            victim = resident page whose NEXT use is furthest after t
                     // a page never used again is evicted first
            evict victim
        load r

; needs knowledge of the future, so OPT is a measuring stick
; for real policies rather than an implementable policy`,
  },
  {
    id: 'clock-page',
    name: 'Second Chance (Clock)',
    abbreviation: 'Clock',
    topicId: 'virtual-memory',
    summary: 'Approximate LRU with a reference bit and a sweeping hand.',
    description:
      'Exact LRU needs a full recency order, which hardware cannot cheaply maintain. Clock keeps one reference bit per frame and a hand that sweeps forward, clearing bits, so pages that were used recently get a second chance before they are evicted.',
    difficulty: 'advanced',
    status: 'available',
    parameters: [],
    properties: { optimal: false, online: true },
    tags: ['page replacement', 'second chance', 'clock', 'approximation'],
    pseudocode: `frames arranged in a circle; each has a reference bit and a hand

for each reference r:
    if r is in a frame:
        hit
        set that frame's reference bit = 1        // second chance
    else:
        fault
        while the frame at hand has reference bit = 1:
            clear the bit                          // give it a second chance
            advance the hand
        evict the frame at hand
        load r and set its reference bit = 1
        advance the hand

; the hand only ever moves forward, so Clock approximates LRU
; cheaply — a common second-chance variant of FIFO`,
  },
  {
    id: 'address-translation',
    name: 'Paging & Address Translation',
    abbreviation: 'Paging',
    topicId: 'virtual-memory',
    summary: 'Split a logical address, walk the TLB and page table, and form a physical address.',
    description:
      'Pages are fixed-size blocks of the logical address space; frames are their counterparts in physical memory. A page table maps one to the other, a TLB caches recent mappings, and a page fault brings an absent page in from disk.',
    difficulty: 'advanced',
    status: 'available',
    parameters: [],
    properties: { optimal: false, online: true },
    tags: ['paging', 'tlb', 'page table', 'address translation'],
    pseudocode: `offsetBits = log2(pageSize)
pageNumber = logicalAddress >> offsetBits
offset     = logicalAddress & (pageSize - 1)

if pageNumber in TLB:            # fast path
    frame = TLB[pageNumber]
else:                            # TLB miss
    entry = pageTable[pageNumber]
    if not entry.valid:          # page fault
        frame = os.loadPage(pageNumber)   # may evict a victim frame
    else:
        frame = entry.frame
    TLB.insert(pageNumber, frame)

physicalAddress = (frame << offsetBits) | offset

; the offset is copied through unchanged — only the page number
; is replaced by the frame number`,
  },

  /* ----------------------------------------------------- Disk scheduling ---- */
  {
    id: 'fcfs-disk',
    name: 'First Come, First Served (Disk)',
    abbreviation: 'FCFS',
    topicId: 'disk-scheduling',
    summary: 'Service the request queue in strict arrival order.',
    description:
      'Disk FCFS is the fairest possible policy — no request can be overtaken — but it is blind to distance, so the head zig-zags across the disk and total seek time is usually the worst of the six.',
    difficulty: 'beginner',
    status: 'available',
    parameters: [],
    properties: { online: true },
    tags: ['seek time', 'arrival order', 'fairness'],
    pseudocode: `head = initial cylinder
distance = 0

for each request in arrival order:
    distance += |request.cylinder - head|
    head = request.cylinder
    service request

; perfectly fair — no request is ever overtaken — but the head
; follows the queue, not the geometry, so seek time is high`,
  },
  {
    id: 'sstf',
    name: 'Shortest Seek Time First',
    abbreviation: 'SSTF',
    topicId: 'disk-scheduling',
    summary: 'Service the request closest to the current head position.',
    description:
      'SSTF cuts average seek distance sharply but can starve requests at the extremes of the disk.',
    difficulty: 'intermediate',
    status: 'available',
    parameters: [],
    properties: { optimal: false, online: true },
    tags: ['seek time', 'starvation'],
    pseudocode: `head = current cylinder
while requests remain:
    next = request with the smallest |cylinder - head|
    distance += |next.cylinder - head|
    head = next.cylinder
    service next

; greedy on seek distance, so requests far from the head can
; wait indefinitely`,
  },
  {
    id: 'scan',
    name: 'SCAN (Elevator)',
    abbreviation: 'SCAN',
    topicId: 'disk-scheduling',
    summary: 'Sweep the disk in one direction, then reverse.',
    description:
      'SCAN bounds the time any request waits, at the cost of revisiting the just-serviced end of the disk after each reversal.',
    difficulty: 'intermediate',
    status: 'available',
    parameters: [],
    properties: { online: true },
    tags: ['seek time', 'elevator'],
    pseudocode: `direction = initial head direction (must be given)
while requests remain:
    while requests exist ahead in the current direction:
        next = nearest request ahead of the head
        distance += |next.cylinder - head|
        head = next.cylinder
        service next

    if no request lies ahead:
        distance += |last cylinder in direction - head|   // travel to the edge
        head = last cylinder
        direction = reverse(direction)`,
  },
  {
    id: 'c-scan',
    name: 'C-SCAN',
    abbreviation: 'C-SCAN',
    topicId: 'disk-scheduling',
    summary: 'Sweep one way only, returning to the start without servicing.',
    description:
      'C-SCAN makes service more uniform than SCAN by treating the disk as a circular list: it sweeps one way, races back to the start without servicing, and sweeps again.',
    difficulty: 'advanced',
    status: 'available',
    parameters: [],
    properties: { online: true },
    tags: ['seek time', 'circular'],
    pseudocode: `direction = initial head direction; it never reverses
while requests remain:
    for each request ahead in the sweep direction:
        distance += |request.cylinder - head|
        head = request.cylinder
        service request

    if requests remain:
        distance += |last cylinder in direction - head|   // reach the edge
        head = last cylinder
        distance += |first cylinder in direction - last cylinder|  // fast return, no service
        head = first cylinder

; every request waits at most one full sweep, so service is
; far more uniform than SCAN`,
  },
  {
    id: 'look',
    name: 'LOOK',
    abbreviation: 'LOOK',
    topicId: 'disk-scheduling',
    summary: 'Reverse at the last request instead of the disk edge.',
    description:
      'LOOK is SCAN without the wasted trip to the physical end of the disk — it reverses as soon as the last request in the current direction has been served.',
    difficulty: 'intermediate',
    status: 'available',
    parameters: [],
    properties: { online: true },
    tags: ['seek time', 'elevator'],
    pseudocode: `direction = initial head direction (must be given)
while requests remain:
    for each request ahead in the current direction, nearest first:
        distance += |request.cylinder - head|
        head = request.cylinder
        service request

    # no travel to the edge: the head is already at the last request
    direction = reverse(direction)

; SCAN minus the empty trip to the disk edge, so it never seeks
; further than the outermost pending request`,
  },
  {
    id: 'c-look',
    name: 'C-LOOK',
    abbreviation: 'C-LOOK',
    topicId: 'disk-scheduling',
    summary: 'Sweep one way, then jump straight to the lowest pending request.',
    description:
      'C-LOOK combines C-SCAN’s one-way sweep with LOOK’s refusal to visit cylinders that hold no request: it jumps from the last request in the sweep to the first pending request beyond the start.',
    difficulty: 'advanced',
    status: 'available',
    parameters: [],
    properties: { online: true },
    tags: ['seek time', 'circular'],
    pseudocode: `direction = initial head direction; it never reverses
while requests remain:
    for each request ahead in the sweep direction:
        distance += |request.cylinder - head|
        head = request.cylinder
        service request

    if requests remain:
        next = the pending request furthest opposite the sweep
        distance += |next.cylinder - head|      // jump, no service
        head = next.cylinder

; C-SCAN without the trip to either end of the disk`,
  },

  /* --------------------------------------------------------- File systems ---- */
  {
    id: 'contiguous-allocation',
    name: 'Contiguous Allocation',
    topicId: 'file-systems',
    summary: 'Store a file in one unbroken run of consecutive disk blocks.',
    description:
      'Contiguous allocation records just a start block and a length, so a file needs almost no metadata and both sequential and random reads are immediate — block i simply lives at start + i. The price is external fragmentation and painful growth: a file can only extend if the block after it is free.',
    difficulty: 'beginner',
    status: 'available',
    parameters: [],
    properties: {},
    tags: ['allocation', 'external fragmentation', 'direct access'],
    pseudocode: `create(size):
    blocks = ceil(size / blockSize)
    find the FIRST unbroken run of 'blocks' free blocks
    if no such run exists:
        fail                        // external fragmentation
    inode.start  = first block of the run
    inode.length = blocks           // no per-block pointers needed

read(file, i):                      // i-th block
    return disk[inode.start + i]    // O(1), sequential or random

append(file):
    if disk[inode.start + inode.length] is free:
        inode.length += 1
    else:
        the whole file must be moved to a larger hole`,
  },
  {
    id: 'linked-allocation',
    name: 'Linked Allocation',
    topicId: 'file-systems',
    summary: 'Chain any free blocks together, each pointing at the next.',
    description:
      'Linked allocation stores the next-block pointer inside each block, so a file can grow into any free block anywhere on the disk and never suffers external fragmentation. Random access is the casualty: reaching block i means following i pointers, and a single damaged pointer breaks the rest of the chain.',
    difficulty: 'intermediate',
    status: 'available',
    parameters: [],
    properties: {},
    tags: ['allocation', 'pointer chain', 'sequential access'],
    pseudocode: `create(size):
    blocks = ceil(size / blockSize)
    previous = null
    for i in 0 .. blocks - 1:
        b = any free block            // adjacency is irrelevant
        mark b used
        if previous != null: disk[previous].next = b
        else: inode.start = b
        previous = b
    disk[previous].next = null        // end-of-file marker

read(file, i):
    b = inode.start
    repeat i times: b = disk[b].next   // O(i) — no direct access
    return disk[b]

; no external fragmentation, but random access is linear`,
  },
  {
    id: 'indexed-allocation',
    name: 'Indexed Allocation (Inodes)',
    topicId: 'file-systems',
    summary: 'Keep every block pointer in the inode, with an index block when needed.',
    description:
      'Indexed allocation puts the block pointers in the inode itself: the first dozen or so are stored directly, and a file larger than that pulls in a single-indirect index block that holds hundreds more pointers. Random access stays O(1) and a file can grow into any free block, at the cost of one extra block per index that fills up.',
    difficulty: 'intermediate',
    status: 'available',
    parameters: [],
    properties: {},
    tags: ['allocation', 'inode', 'direct access'],
    pseudocode: `create(size):
    blocks = ceil(size / blockSize)
    for i in 0 .. blocks - 1:
        b = any free block
        mark b used
        if i < 12:
            inode.direct[i] = b        // 12 direct pointers
        else:
            if inode.indirect == null:
                inode.indirect = allocate an index block
            inode.indirect[i - 12] = b // pointers live in a block

read(file, i):
    if i < 12: return disk[inode.direct[i]]
    else:      return disk[inode.indirect[i - 12]]

; O(1) random access; a large file spends blocks on pointers
; one index block holds blockSize / 4 more blocks`,
  },
];

export const ALGORITHMS_BY_ID: ReadonlyMap<string, Algorithm> = new Map(
  ALGORITHMS.map((algorithm) => [algorithm.id, algorithm]),
);
