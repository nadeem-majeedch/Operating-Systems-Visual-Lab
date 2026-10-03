import type { EducationalExample } from '@/types';
import type {
  BankersInput,
  DiskInput,
  FsInput,
  MemoryInput,
  PageReplacementInput,
  PagingInput,
  PhilosophersInput,
  ProcessInput,
  ProcessLifecycleInput,
  ProducerConsumerInput,
  RaceInput,
  RagInput,
  ReadersWritersInput,
  RoundRobinInput,
} from '@/engine';

/**
 * Worked examples, grouped by the lab that owns them.
 *
 * Examples for labs whose simulator already exists carry a ready-to-load
 * `input`. Examples for `planned` labs stay conceptual: they describe the
 * scenario and the outcome to look for, without pretending to be executable.
 */
export const EXAMPLES_BY_LAB: Readonly<Record<string, readonly EducationalExample<unknown>[]>> = {
  'lab-fcfs': [
    {
      id: 'fcfs-textbook',
      title: 'Textbook mix',
      scenario:
        'Four processes arrive at t = 0, 2, 4 and 5 with CPU bursts of 7, 4, 1 and 4. A single CPU serves them first-come, first-served.',
      difficulty: 'beginner',
      input: {
        processes: [
          { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 7 },
          { id: 'p2', name: 'P2', arrivalTime: 2, burstTime: 4 },
          { id: 'p3', name: 'P3', arrivalTime: 4, burstTime: 1 },
          { id: 'p4', name: 'P4', arrivalTime: 5, burstTime: 4 },
        ],
      } satisfies ProcessInput,
      expectedOutcome:
        'The CPU is busy from t = 0 to t = 16 with no idle gaps. Average turnaround time is 8.75 and average waiting time is 4.75.',
      discussion: [
        'P3 needs only 1 time unit but waits until t = 11. Which property of FCFS causes that?',
        'What happens to the average waiting time if P1 had been the shortest job instead of the longest?',
        'Would SJF have produced a shorter average turnaround time for this same arrival pattern?',
      ],
      hints: [
        'Waiting time = start time − arrival time.',
        'Only non-preemptive policies leave a running process untouched when a new one arrives.',
      ],
    },
    {
      id: 'fcfs-convoy',
      title: 'The convoy effect',
      scenario:
        'A 12-unit job arrives at t = 0 and is followed at t = 1, 2 and 3 by three 2-unit jobs.',
      difficulty: 'intermediate',
      input: {
        processes: [
          { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 12 },
          { id: 'p2', name: 'P2', arrivalTime: 1, burstTime: 2 },
          { id: 'p3', name: 'P3', arrivalTime: 2, burstTime: 2 },
          { id: 'p4', name: 'P4', arrivalTime: 3, burstTime: 2 },
        ],
      } satisfies ProcessInput,
      expectedOutcome:
        'Average waiting time is 9.0 — the three short jobs are stuck behind one long job even though they arrived later.',
      discussion: [
        'Why is this called the convoy effect?',
        'How would Round Robin with a quantum of 3 change the picture?',
      ],
      hints: ['Look at the gap between arrival time and start time for P2, P3 and P4.'],
    },
  ],

  'lab-sjf': [
    {
      id: 'sjf-optimality',
      title: 'Why shortest-first wins',
      scenario:
        'Three jobs are ready at t = 0 with bursts 9, 3 and 6, in that arrival order. Compare FCFS with SJF on average waiting time.',
      difficulty: 'intermediate',
      input: {
        processes: [
          { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 9 },
          { id: 'p2', name: 'P2', arrivalTime: 0, burstTime: 3 },
          { id: 'p3', name: 'P3', arrivalTime: 0, burstTime: 6 },
        ],
      } satisfies ProcessInput,
      expectedOutcome:
        'FCFS averages 7.0 time units of waiting, while SJF averages 4.0 — and no ordering beats it for simultaneous arrivals.',
      discussion: [
        'Which arrival pattern breaks the optimality of SJF?',
        'How does the OS estimate burst times in practice?',
      ],
      hints: ['Optimality is proven by an exchange argument on adjacent jobs.'],
    },
    {
      id: 'sjf-preemption',
      title: 'SRTF takes the CPU away',
      scenario:
        'P1 needs 7 units from t = 0. At t = 2 a 4-unit job arrives, at t = 4 a 1-unit job, and at t = 5 another 4-unit job. Switch to SRTF and watch the running job lose the CPU.',
      difficulty: 'advanced',
      input: {
        processes: [
          { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 7 },
          { id: 'p2', name: 'P2', arrivalTime: 2, burstTime: 4 },
          { id: 'p3', name: 'P3', arrivalTime: 4, burstTime: 1 },
          { id: 'p4', name: 'P4', arrivalTime: 5, burstTime: 4 },
        ],
      } satisfies ProcessInput,
      expectedOutcome:
        'SRTF preempts P1 twice and finishes the three short jobs first, cutting average waiting time to 3.0 at the cost of more context switches than plain SJF.',
      discussion: [
        'Which two arrivals caused a preemption, and why did the second one not?',
        'Why does SRTF need the OS to track remaining time for every ready process?',
      ],
      hints: ['A preemption happens only when the newcomer has strictly less remaining work.'],
    },
  ],

  'lab-priority-scheduling': [
    {
      id: 'priority-nonpreemptive-block',
      title: 'Urgency versus the running burst',
      scenario:
        'P1 (priority 3) is dispatched at t = 0 for 4 units. P2 (priority 1) arrives at t = 1 and P3 (priority 2) at t = 2. Run the non-preemptive variant first.',
      difficulty: 'beginner',
      input: {
        processes: [
          { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 4, priority: 3 },
          { id: 'p2', name: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
          { id: 'p3', name: 'P3', arrivalTime: 2, burstTime: 2, priority: 2 },
        ],
      } satisfies ProcessInput,
      expectedOutcome:
        'P1 keeps the CPU for its whole burst and completes at t = 4; only then does P2 run. P2 is the most urgent process in the system yet still waits.',
      discussion: [
        'Which process gained from P2 and P3 having to wait, and by how much?',
        'What change would let P2 take the CPU at t = 1?',
      ],
      hints: ['The non-preemptive variant re-picks a process only when the current burst finishes.'],
    },
    {
      id: 'priority-preemptive-urgent',
      title: 'Preemption for urgent arrivals',
      scenario:
        'The same three processes as the previous example, now under the preemptive variant. P2 (priority 1) arrives at t = 1 while P1 is mid-burst.',
      difficulty: 'intermediate',
      input: {
        processes: [
          { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 4, priority: 3 },
          { id: 'p2', name: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
          { id: 'p3', name: 'P3', arrivalTime: 2, burstTime: 2, priority: 2 },
        ],
      } satisfies ProcessInput,
      expectedOutcome:
        'P1 runs for 1 unit, P2 preempts it and runs 1→4, P3 runs 4→6, and P1 finally finishes at t = 9. Response time for urgent work falls while P1 waits longer.',
      discussion: [
        'Compare P1 completion time here with the non-preemptive run — what did preemption cost it?',
        'How would a stream of priority-1 arrivals affect P1 over a long run?',
      ],
      hints: ['A preemption is recorded whenever the running process is replaced by a higher-priority arrival.'],
    },
  ],

  'lab-round-robin': [
    {
      id: 'rr-quantum',
      title: 'Choosing the quantum',
      scenario:
        'Four interactive processes each need 10 time units. Sweep the quantum from 1 to 20 and watch response time versus context-switch count.',
      difficulty: 'intermediate',
      input: {
        processes: [
          { id: 'p1', name: 'P1', arrivalTime: 0, burstTime: 10 },
          { id: 'p2', name: 'P2', arrivalTime: 0, burstTime: 10 },
          { id: 'p3', name: 'P3', arrivalTime: 0, burstTime: 10 },
          { id: 'p4', name: 'P4', arrivalTime: 0, burstTime: 10 },
        ],
        quantum: 4,
      } satisfies RoundRobinInput,
      expectedOutcome:
        'Response time falls as the quantum shrinks, while the number of context switches rises sharply.',
      discussion: [
        'At what quantum does Round Robin behave exactly like FCFS?',
        'Why must the quantum be much larger than a context switch to be worth it?',
      ],
      hints: ['A quantum larger than the longest burst never causes a preemption.'],
    },
  ],

  'lab-process-lifecycle': [
    {
      id: 'lifecycle-trace',
      title: 'Tracing one process',
      scenario:
        'A shell starts a single program. Walk it from creation to exit, blocking on I/O once and resuming afterwards.',
      difficulty: 'beginner',
      input: {
        seeds: [{ name: 'P1', priority: 3, burstTime: 4 }],
      } satisfies ProcessLifecycleInput,
      expectedOutcome:
        'P1 visits new → ready → running → waiting → ready → running → terminated. The event log shows the block on I/O and the later unblock, and the PCB records one CPU burst split by the wait.',
      discussion: [
        'Which transitions were caused by the scheduler and which by the process itself?',
        'What information must the PCB hold so the process can resume after the I/O wait?',
      ],
      hints: ['Only the running process can request I/O.'],
    },
    {
      id: 'lifecycle-io-interleave',
      title: 'Blocking frees the CPU',
      scenario:
        'Two processes are ready. The first blocks on I/O almost immediately, so the second must be dispatched behind it.',
      difficulty: 'beginner',
      input: {
        seeds: [
          { name: 'P1', priority: 2, burstTime: 4 },
          { name: 'P2', priority: 4, burstTime: 3 },
        ],
      } satisfies ProcessLifecycleInput,
      expectedOutcome:
        'Blocking P1 moves it to waiting, and the scheduler dispatches P2. Unblocking P1 returns it to ready while P2 finishes, and exactly one context switch is recorded.',
      discussion: [
        'Why does blocking a process not leave the CPU idle?',
        'What would change if P1 and P2 had the same priority?',
      ],
      hints: ['Use “Block on I/O”, then “Scheduler next”, then “Complete I/O”.'],
    },
    {
      id: 'lifecycle-context-switch',
      title: 'Counting context switches',
      scenario:
        'Two equal-priority processes each need four units of CPU. Alternate between them and watch the context-switch counter.',
      difficulty: 'intermediate',
      input: {
        seeds: [
          { name: 'A', priority: 5, burstTime: 4 },
          { name: 'B', priority: 5, burstTime: 4 },
        ],
      } satisfies ProcessLifecycleInput,
      expectedOutcome:
        'Every handover between A and B adds exactly one context switch, while a first dispatch onto an idle CPU and re-dispatching the same process add none.',
      discussion: [
        'Why is a context switch pure overhead for the system?',
        'What does the kernel actually save and restore during a switch?',
      ],
      hints: ['A switch happens only when the CPU moves between two different processes.'],
    },
    {
      id: 'lifecycle-fork-tree',
      title: 'A parent and its children',
      scenario:
        'A parent process creates two children. Each child inherits a parent PID and gets its own PCB.',
      difficulty: 'intermediate',
      input: {
        seeds: [
          { name: 'init', priority: 1, burstTime: 5 },
          { name: 'P1', priority: 3, burstTime: 2, parent: 'init' },
          { name: 'P2', priority: 6, burstTime: 2, parent: 'init' },
        ],
      } satisfies ProcessLifecycleInput,
      expectedOutcome:
        'Three PCBs exist, both children point at init as their parent, and the priority scheduler always runs the lowest-numbered ready process first.',
      discussion: [
        'What does each child inherit from its parent, and what is private to it?',
        'Why does the parent PID matter when a child terminates?',
      ],
      hints: ['Creation never copies CPU time — every PCB starts its counters at zero.'],
    },
  ],

  'lab-fork-exec': [
    {
      id: 'fork-tree',
      title: 'Counting processes',
      scenario: 'A program calls fork() twice in a row without checking the return value.',
      difficulty: 'intermediate',
      expectedOutcome: 'Four processes reach the end of the program (2ⁿ for n consecutive forks).',
      discussion: [
        'How does copy-on-write keep this cheap?',
        'What does exec change, and what does it deliberately keep?',
      ],
      hints: ['Each fork doubles the number of processes still running.'],
    },
  ],

  'lab-mutex': [
    {
      id: 'mutex-race',
      title: 'A lost update',
      scenario:
        'Two processes each increment a shared counter twice. An increment is three instructions — load, add, store — and nothing stops the two processes from interleaving.',
      difficulty: 'beginner',
      input: { mode: 'unsafe', iterations: 2, processCount: 2 } satisfies RaceInput,
      expectedOutcome:
        'The counter ends at 2 instead of the correct 4: both processes read the same value and one store overwrites the other, losing an update.',
      discussion: [
        'Which two instructions of the two processes actually collide?',
        'Why does adding a third process lose still more updates?',
      ],
      hints: ['Watch the register values when each process loads the counter.'],
    },
    {
      id: 'mutex-locked',
      title: 'The same workload, protected',
      scenario:
        'Two processes increment the same shared counter twice each, but this time every increment runs inside a critical section guarded by a mutex.',
      difficulty: 'beginner',
      input: { mode: 'mutex', iterations: 2, processCount: 2 } satisfies RaceInput,
      expectedOutcome:
        'The counter reaches exactly 4. Whenever one process holds the lock the other is blocked, so no load–add–store triple is ever split.',
      discussion: [
        'What does a blocked process do instead of running?',
        'Would a binary semaphore behave any differently here?',
      ],
      hints: ['Compare the final counter with the unsafe run.'],
    },
  ],

  'lab-bounded-buffer': [
    {
      id: 'bounded-buffer-steady',
      title: 'Producer and consumer in step',
      scenario:
        'A two-slot buffer shared by one producer and one consumer, both using empty, full and mutex semaphores.',
      difficulty: 'intermediate',
      input: {
        capacity: 2,
        producers: 1,
        consumers: 1,
        itemsPerProducer: 4,
        itemsPerConsumer: 4,
      } satisfies ProducerConsumerInput,
      expectedOutcome:
        'Every produced item is consumed and the buffer never holds more than two items. Consumers block when full is zero; the matching signal wakes them.',
      discussion: [
        'What would happen if the consumer omitted wait(full)?',
        'Why does mutex guard the buffer array rather than its capacity?',
      ],
      hints: ['Watch the three semaphore values change together.'],
    },
    {
      id: 'bounded-buffer-full',
      title: 'A full buffer throttles the producer',
      scenario:
        'Two producers and one consumer share a two-slot buffer. The producers try to run ahead.',
      difficulty: 'intermediate',
      input: {
        capacity: 2,
        producers: 2,
        consumers: 1,
        itemsPerProducer: 4,
        itemsPerConsumer: 4,
      } satisfies ProducerConsumerInput,
      expectedOutcome:
        'Once the buffer is full, empty reaches zero and a producer blocks until the consumer frees a slot — the buffer can never overflow.',
      discussion: [
        'What does a negative semaphore value represent?',
        'Why is blocking better than the producer spinning on a full buffer?',
      ],
      hints: ['Follow the empty semaphore all the way to zero.'],
    },
  ],

  'lab-dining-philosophers': [
    {
      id: 'phil-deadlock-example',
      title: 'The circular wait closes',
      scenario:
        'Five philosophers each reach for the fork on their left and then their right, at the same time.',
      difficulty: 'intermediate',
      input: { philosophers: 5, meals: 2, strategy: 'naive' } satisfies PhilosophersInput,
      expectedOutcome:
        'Each philosopher holds one fork and waits forever for the second, so the whole table deadlocks with zero meals eaten.',
      discussion: [
        'Which Coffman condition does the left-first order create?',
        'Is the deadlock a crash, or just permanent waiting?',
      ],
      hints: ['Look at which fork each philosopher is waiting for.'],
    },
    {
      id: 'phil-ordered-example',
      title: 'Ordering the forks',
      scenario:
        'The same five philosophers, except the last one picks up the right fork before the left.',
      difficulty: 'intermediate',
      input: { philosophers: 5, meals: 2, strategy: 'ordered' } satisfies PhilosophersInput,
      expectedOutcome:
        'The circular wait can no longer close, so every philosopher finishes both meals.',
      discussion: [
        'Which single philosopher breaks the cycle, and why is that enough?',
        'How does limiting the table to four philosophers achieve the same thing?',
      ],
      hints: ['A cycle needs every philosopher to hold a left fork while waiting for a right one.'],
    },
  ],

  'lab-readers-writers': [
    {
      id: 'rw-mixed-example',
      title: 'Readers overlap, a writer excludes',
      scenario:
        'Two readers each read twice while one writer performs a write, all sharing the data.',
      difficulty: 'intermediate',
      input: { readers: 2, writers: 1, reads: 2, writes: 1 } satisfies ReadersWritersInput,
      expectedOutcome:
        'Both readers can be inside at the same time, but while the writer holds the lock no reader is inside and vice versa.',
      discussion: [
        'Why is a read safe to share but a write not?',
        'What does the first reader in acquire on behalf of the others?',
      ],
      hints: ['Watch the readCount and writeLock values together.'],
    },
    {
      id: 'rw-starvation-example',
      title: 'Readers-preference starvation',
      scenario:
        'Three readers perform three reads each against a single writer that needs two writes.',
      difficulty: 'advanced',
      input: { readers: 3, writers: 1, reads: 3, writes: 2 } satisfies ReadersWritersInput,
      expectedOutcome:
        'The writer keeps waiting while the readers keep overlapping, and may still be queued when the run ends — readers-preference can starve a writer.',
      discussion: [
        'What change would give writers a fair turn?',
        'Why is starvation possible even though the system is not deadlocked?',
      ],
      hints: ['Look at the “writers waiting” counter over time.'],
    },
  ],

  'lab-bankers': [
    {
      id: 'bankers-safe',
      title: 'Is the system safe?',
      scenario:
        'Five processes hold portions of three resource types. Ask the algorithm whether the current allocation is safe and whether a pending request can be granted.',
      difficulty: 'advanced',
      input: {
        processes: ['P0', 'P1', 'P2', 'P3', 'P4'],
        resources: ['A', 'B', 'C'],
        allocation: [
          [0, 1, 0],
          [2, 0, 0],
          [3, 0, 2],
          [2, 1, 1],
          [0, 0, 2],
        ],
        max: [
          [7, 5, 3],
          [3, 2, 2],
          [9, 0, 2],
          [2, 2, 2],
          [4, 3, 3],
        ],
        available: [3, 3, 2],
      } satisfies BankersInput,
      expectedOutcome:
        'A full safe sequence exists (P1, P3, P0, P2, P4), so the state is safe and the banker may keep granting requests.',
      discussion: [
        'Why does a safe state not guarantee that no deadlock will ever occur?',
        'What does the algorithm assume about how long a process can hold resources?',
      ],
      hints: ['The algorithm simulates the worst case: every process asks for its maximum.'],
    },
    {
      id: 'bankers-request-deferred',
      title: 'A request that must wait',
      scenario:
        'The same five processes, this time with P4 asking for three units of A and three of B. The request is within P4’s need and within the free resources.',
      difficulty: 'advanced',
      input: {
        processes: ['P0', 'P1', 'P2', 'P3', 'P4'],
        resources: ['A', 'B', 'C'],
        allocation: [
          [0, 1, 0],
          [2, 0, 0],
          [3, 0, 2],
          [2, 1, 1],
          [0, 0, 2],
        ],
        max: [
          [7, 5, 3],
          [3, 2, 2],
          [9, 0, 2],
          [2, 2, 2],
          [4, 3, 3],
        ],
        available: [3, 3, 2],
        request: { process: 4, resources: [3, 3, 0] },
      } satisfies BankersInput,
      expectedOutcome:
        'Granting the request would leave no safe sequence, so the allocation is rolled back and P4 waits — the state is left exactly as it was.',
      discussion: [
        'Which process can still finish first in the reduced state, and why?',
        'Why is the request postponed rather than rejected?',
      ],
      hints: ['Watch the tentative allocation being undone in the “Roll back” step.'],
    },
  ],

  'lab-wait-for-graph': [
    {
      id: 'wfg-cycle',
      title: 'Spot the cycle',
      scenario: 'Three processes each hold one resource and wait for the next, one instance per resource.',
      difficulty: 'intermediate',
      input: {
        processes: ['P1', 'P2', 'P3'],
        resources: ['R1', 'R2', 'R3'],
        instances: [1, 1, 1],
        allocation: [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
        requests: [
          [0, 1, 0],
          [0, 0, 1],
          [1, 0, 0],
        ],
      } satisfies RagInput,
      expectedOutcome:
        'The request edges close a cycle in the wait-for graph, which proves deadlock for single-instance resources.',
      discussion: [
        'Why is the cycle condition insufficient once resources have multiple instances?',
        'Where does the deadlock actually break under preemption?',
      ],
      hints: ['A cycle needs at least two processes.'],
    },
    {
      id: 'wfg-instances',
      title: 'A cycle that is not a deadlock',
      scenario:
        'Two processes: P1 holds one unit of A and wants B, P2 holds B and wants A. Resource A has two instances.',
      difficulty: 'advanced',
      input: {
        processes: ['P1', 'P2'],
        resources: ['A', 'B'],
        instances: [2, 1],
        allocation: [
          [1, 0],
          [0, 1],
        ],
        requests: [
          [0, 1],
          [1, 0],
        ],
      } satisfies RagInput,
      expectedOutcome:
        'The collapsed graph shows a cycle, but A’s spare instance lets the reduction algorithm finish every process — no deadlock.',
      discussion: [
        'Which free instance breaks the apparent cycle?',
        'State the exact condition under which a cycle proves deadlock.',
      ],
      hints: ['Cycle is necessary and sufficient only when every resource in it has a single instance.'],
    },
  ],

  'lab-contiguous-allocation': [
    {
      id: 'first-fit-holes',
      title: 'Placing and freeing',
      scenario:
        'Four processes of 200, 300, 150 and 250 units fill a 1000-unit memory. One is freed, then a new 250-unit process arrives.',
      difficulty: 'intermediate',
      input: {
        mode: 'variable',
        policy: 'first-fit',
        totalSize: 1000,
        operations: [
          { kind: 'allocate', name: 'A', size: 200 },
          { kind: 'allocate', name: 'B', size: 300 },
          { kind: 'allocate', name: 'C', size: 150 },
          { kind: 'allocate', name: 'D', size: 250 },
          { kind: 'deallocate', name: 'B' },
          { kind: 'allocate', name: 'E', size: 250 },
        ],
      } satisfies MemoryInput,
      expectedOutcome:
        'E fills the hole B left behind, leaving two small free blocks. Switch the policy to best, worst and next fit and the same request lands in a different hole.',
      discussion: [
        'Which strategy leaves the largest usable hole for the next request?',
        'When does next fit differ from first fit?',
      ],
      hints: ['Track every hole, not just the total free space.'],
    },
    {
      id: 'fragmentation-compaction',
      title: 'External fragmentation and compaction',
      scenario:
        'Three holes of 300 units each are created, then an 800-unit request arrives. Total free memory is 900 units.',
      difficulty: 'advanced',
      input: {
        mode: 'variable',
        policy: 'first-fit',
        totalSize: 1200,
        operations: [
          { kind: 'allocate', name: 'A', size: 300 },
          { kind: 'allocate', name: 'X', size: 150 },
          { kind: 'allocate', name: 'B', size: 300 },
          { kind: 'allocate', name: 'Y', size: 150 },
          { kind: 'allocate', name: 'C', size: 300 },
          { kind: 'deallocate', name: 'A' },
          { kind: 'deallocate', name: 'B' },
          { kind: 'deallocate', name: 'C' },
          { kind: 'allocate', name: 'E', size: 800 },
          { kind: 'compact' },
          { kind: 'allocate', name: 'E', size: 800 },
        ],
      } satisfies MemoryInput,
      expectedOutcome:
        'The 800-unit request fails despite 900 units being free, because no single hole is large enough. Compacting merges the holes into one 900-unit block and the request then succeeds.',
      discussion: [
        'Why does the request fail when free memory exceeds the request?',
        'What does compaction cost the system?',
      ],
      hints: ['Look at the largest free block, not the total free memory.'],
    },
  ],

  'lab-fixed-partitions': [
    {
      id: 'fixed-internal-waste',
      title: 'Waste inside partitions',
      scenario:
        'A 1000-unit memory is divided into four 250-unit partitions before any process arrives. Four 200-unit processes are admitted.',
      difficulty: 'beginner',
      input: {
        mode: 'fixed',
        policy: 'first-fit',
        totalSize: 1000,
        partitions: [250, 250, 250, 250],
        operations: [
          { kind: 'allocate', name: 'A', size: 200 },
          { kind: 'allocate', name: 'B', size: 200 },
          { kind: 'allocate', name: 'C', size: 200 },
          { kind: 'allocate', name: 'D', size: 200 },
        ],
      } satisfies MemoryInput,
      expectedOutcome:
        'Each process occupies a full 250-unit partition while using only 200 units, so 50 units per partition — 200 in total — are trapped as internal fragmentation.',
      discussion: [
        'Could a smaller partition size remove the waste without making some requests wait?',
        'Why is there no external fragmentation here?',
      ],
      hints: ['Internal waste is partition size minus process size, on every block.'],
    },
  ],

  'lab-buddy-system': [
    {
      id: 'buddy-splits',
      title: 'Splitting and merging',
      scenario: 'Request blocks of 64 KB, 100 KB and 300 KB from a 1 MB buddy heap, then free them in a different order.',
      difficulty: 'intermediate',
      expectedOutcome: 'A 100 KB request consumes a 128 KB block; freeing neighbours coalesces back into 1 MB.',
      discussion: [
        'How much internal fragmentation does the 100 KB request create?',
        'Why is coalescing only possible between buddies?',
      ],
      hints: ['Every block size is a power of two.'],
    },
  ],

  'lab-page-replacement': [
    {
      id: 'page-replacement-compare',
      title: 'Same string, four policies',
      scenario:
        'Replay the reference string 7 0 1 2 0 3 0 4 2 3 0 3 over three frames under FIFO, then switch policy to LRU, OPT and Clock and compare.',
      difficulty: 'intermediate',
      input: {
        algorithm: 'fifo',
        frameCount: 3,
        referenceString: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3],
      } satisfies PageReplacementInput,
      expectedOutcome:
        'FIFO faults 10 times, LRU 9, Clock 9 and OPT only 7 — OPT evicts the page not needed for the longest time, so it is the lower bound.',
      discussion: [
        'Which references are hits, and why is a hit impossible once the page has been evicted?',
        'Why does OPT need the whole reference string before it can run?',
      ],
      hints: ['Count frames at fault time, not the number of evictions.', 'Use comparison mode to line the policies up side by side.'],
    },
    {
      id: 'page-replacement-belady',
      title: "Trigger Bélády's anomaly",
      scenario:
        'Run FIFO over the string 1 2 3 4 1 2 5 1 2 3 4 5 with three frames, then give it four frames instead.',
      difficulty: 'advanced',
      input: {
        algorithm: 'fifo',
        frameCount: 4,
        referenceString: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5],
      } satisfies PageReplacementInput,
      expectedOutcome:
        'FIFO faults 9 times with three frames and 10 with four — adding memory made it worse, which is impossible for LRU or OPT.',
      discussion: [
        'Why does the extra frame change which pages are resident instead of simply helping?',
        'What property makes LRU immune to this anomaly?',
      ],
      hints: ['Open comparison mode and read the fault-count curve for each policy.'],
    },
    {
      id: 'page-replacement-clock',
      title: 'Second chance in action',
      scenario:
        'Run Second Chance (Clock) over the anomaly string with three frames and watch the hand sweep.',
      difficulty: 'advanced',
      input: {
        algorithm: 'clock',
        frameCount: 3,
        referenceString: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5],
      } satisfies PageReplacementInput,
      expectedOutcome:
        'On the first replacement the hand clears three reference bits before it finds a frame with a clear bit, so the oldest unreserved page is evicted — LRU-like behaviour from a single bit per frame.',
      discussion: [
        'How is Clock similar to FIFO, and how does it differ?',
        'Why can a single reference bit only approximate LRU rather than reproduce it exactly?',
      ],
      hints: ['The reference bit is set on a hit and cleared by the sweeping hand.'],
    },
  ],

  'lab-tlb-translation': [
    {
      id: 'tlb-walk',
      title: 'Walk a stream of addresses',
      scenario:
        'Translate the addresses 0, 64, 128, 100, 128, 0 and 192 through a 4-entry TLB over 64-byte pages with two-bit page and frame numbers.',
      difficulty: 'advanced',
      input: {
        pageSize: 64,
        logicalAddressBits: 8,
        physicalAddressBits: 8,
        tlbSize: 4,
        tlbPolicy: 'lru',
        references: [0, 64, 128, 100, 128, 0, 192],
        absentPages: [],
      } satisfies PagingInput,
      expectedOutcome:
        'Each address splits into a page number and an offset; the first touch of a page walks the page table, repeats hit the TLB, and the offset is copied through unchanged into the physical address.',
      discussion: [
        'Which references are TLB hits, and what does a miss cost that a hit does not?',
        'What changes if the TLB holds only two entries?',
      ],
      hints: ['The offset never changes during translation.'],
    },
    {
      id: 'tlb-fault',
      title: 'Fault a page in',
      scenario:
        'Page 2 starts absent in a four-page space; translate 128, 128 and 192 with 64-byte pages.',
      difficulty: 'advanced',
      input: {
        pageSize: 64,
        logicalAddressBits: 8,
        physicalAddressBits: 8,
        tlbSize: 4,
        tlbPolicy: 'lru',
        references: [128, 128, 192],
        absentPages: [2],
      } satisfies PagingInput,
      expectedOutcome:
        'The first reference to page 2 faults and loads it into a free frame; the next reference to page 2 is a TLB hit.',
      discussion: [
        'Why is a page fault more expensive than a TLB miss?',
        'What happens when no frame is free?',
      ],
      hints: ['A page fault means the valid bit is clear, so the OS must act.'],
    },
    {
      id: 'tlb-invalid',
      title: 'Reject an invalid address',
      scenario:
        'An 8-bit logical space accepts addresses up to 255; translate 0, 300 and 128 with 64-byte pages.',
      difficulty: 'intermediate',
      input: {
        pageSize: 64,
        logicalAddressBits: 8,
        physicalAddressBits: 8,
        tlbSize: 4,
        tlbPolicy: 'lru',
        references: [0, 300, 128],
        absentPages: [],
      } satisfies PagingInput,
      expectedOutcome:
        'Address 300 exceeds the logical address space and is rejected before any page-table walk; the other two are translated normally.',
      discussion: [
        'Is an out-of-range address the same as a page fault?',
        'Where does the hardware detect the problem — at the page number or at physical memory?',
      ],
      hints: ['Compare the address against 2^logicalAddressBits.'],
    },
  ],

  'lab-disk-scheduling': [
    {
      id: 'disk-sweep',
      title: 'Same queue, six policies',
      scenario:
        'Service the queue 98, 183, 37, 122, 14, 124, 65, 67 across cylinders 0–199 from head 53, sweeping up, under FCFS, SSTF, SCAN, C-SCAN, LOOK and C-LOOK.',
      difficulty: 'intermediate',
      input: {
        algorithm: 'fcfs',
        diskSize: 200,
        head: 53,
        requests: [98, 183, 37, 122, 14, 124, 65, 67],
        direction: 'up',
      } satisfies DiskInput,
      expectedOutcome:
        'FCFS travels 640 cylinders, SSTF only 236, SCAN 331, C-SCAN 382, LOOK 299 and C-LOOK 322 — raw distance is not the whole story.',
      discussion: [
        'Which policy is fairest, and what does fairness cost in total seek distance?',
        'When does the head direction matter more than the queue order?',
      ],
      hints: ['Draw the head movement as a line graph before summing distances.', 'Compare mode lines all six up at once.'],
    },
    {
      id: 'disk-sstf-starvation',
      title: 'How SSTF starves a request',
      scenario:
        'A cluster of requests at cylinders 51–59 surrounds the head at 50, while cylinder 10 arrived first and waits at the far end.',
      difficulty: 'intermediate',
      input: {
        algorithm: 'sstf',
        diskSize: 200,
        head: 50,
        requests: [10, 51, 52, 53, 54, 55, 56, 57, 58, 59],
        direction: 'up',
      } satisfies DiskInput,
      expectedOutcome:
        'SSTF serves the nine nearby requests first and cylinder 10 last, even though it was queued first — the starvation risk in miniature.',
      discussion: [
        'What would happen if new requests kept arriving next to the head?',
        'Which policies guarantee a bound on waiting time, and why?',
      ],
      hints: ['Watch the pending list: the far request never becomes the nearest.']
    },
    {
      id: 'disk-scan-direction',
      title: 'SCAN sweeps to the edge',
      scenario:
        'Run SCAN upward from head 53 over the classic queue and watch the head travel to cylinder 199 before it reverses.',
      difficulty: 'intermediate',
      input: {
        algorithm: 'scan',
        diskSize: 200,
        head: 53,
        requests: [98, 183, 37, 122, 14, 124, 65, 67],
        direction: 'up',
      } satisfies DiskInput,
      expectedOutcome:
        'SCAN services 65, 67, 98, 122, 124, 183 on the way up, seeks to 199 without servicing, then reverses and serves 37 and 14 — 331 cylinders in all.',
      discussion: [
        'Why is the trip to 199 counted even though no request waits there?',
        'How does that trip bound the waiting time of every request?',
      ],
      hints: ['The head only reverses at the physical end of the disk.'],
    },
    {
      id: 'disk-look-vs-scan',
      title: 'LOOK skips the edge',
      scenario:
        'Run the same upward sweep under LOOK and compare the total movement with SCAN.',
      difficulty: 'intermediate',
      input: {
        algorithm: 'look',
        diskSize: 200,
        head: 53,
        requests: [98, 183, 37, 122, 14, 124, 65, 67],
        direction: 'up',
      } satisfies DiskInput,
      expectedOutcome:
        'LOOK reverses at cylinder 183 instead of travelling to 199, so it moves 299 cylinders against SCAN’s 331 while still bounding every wait to one sweep.',
      discussion: [
        'Why can LOOK never move further than SCAN on the same queue and direction?',
        'When might SCAN’s edge trip actually be useful?',
      ],
      hints: ['LOOK only ever seeks between requests, never to an empty cylinder.'],
    },
    {
      id: 'disk-cscan-clook',
      title: 'Circular sweeps',
      scenario:
        'Run C-SCAN upward over the classic queue, then C-LOOK, and compare how each returns to the low end.',
      difficulty: 'advanced',
      input: {
        algorithm: 'c-scan',
        diskSize: 200,
        head: 53,
        requests: [98, 183, 37, 122, 14, 124, 65, 67],
        direction: 'up',
      } satisfies DiskInput,
      expectedOutcome:
        'C-SCAN travels to 199 and returns to 0 without servicing (382 cylinders); C-LOOK jumps straight from 183 to 14 (322 cylinders) and serves the same low requests sooner.',
      discussion: [
        'Why does C-SCAN give more uniform service than SCAN?',
        'What does C-LOOK give up compared with C-SCAN?',
      ],
      hints: ['The return trip in a circular policy is a single unserviced seek.'],
    },
  ],

  'lab-file-allocation': [
    {
      id: 'allocation-compare',
      title: 'Contiguous vs linked vs indexed',
      scenario:
        'Fill an eight-block disk with single-block files, free two isolated blocks, then ask for a file that needs two adjacent blocks.',
      difficulty: 'intermediate',
      input: {
        allocation: 'contiguous',
        blockCount: 8,
        blockSize: 256,
        inodeCount: 12,
        operations: [
          { kind: 'create', path: '/a', size: 256, mode: 0o644 },
          { kind: 'create', path: '/b', size: 256, mode: 0o644 },
          { kind: 'create', path: '/c', size: 256, mode: 0o644 },
          { kind: 'create', path: '/d', size: 256, mode: 0o644 },
          { kind: 'create', path: '/e', size: 256, mode: 0o644 },
          { kind: 'create', path: '/f', size: 256, mode: 0o644 },
          { kind: 'create', path: '/g', size: 256, mode: 0o644 },
          { kind: 'create', path: '/h', size: 256, mode: 0o644 },
          { kind: 'delete', path: '/b' },
          { kind: 'delete', path: '/d' },
          { kind: 'create', path: '/i', size: 512, mode: 0o644 },
          { kind: 'delete', path: '/c' },
          { kind: 'delete', path: '/e' },
          { kind: 'create', path: '/j', size: 512, mode: 0o644 },
        ],
      } satisfies FsInput,
      expectedOutcome:
        'Contiguous allocation rejects the 2-block /i — blocks 1 and 3 are free but not adjacent (external fragmentation) — then accepts /j once /c and /e are freed and the holes merge. Switch the allocation strategy to linked or indexed and the same script never fails.',
      discussion: [
        'Which strategy handles a sparse file with the fewest blocks?',
        'Why does the indexed inode need no start block while contiguous does?',
      ],
      hints: ['Compare both sequential and random read cost.', 'Load the fs-contiguous preset for the identical script.'],
    },
    {
      id: 'allocation-grow',
      title: 'Growing into a taken block',
      scenario:
        'A 256-byte file wants to grow to 512 bytes, but the block right after it is held by a large neighbour; the neighbour is first truncated, then deleted, and the grow is retried.',
      difficulty: 'intermediate',
      input: {
        allocation: 'contiguous',
        blockCount: 8,
        blockSize: 256,
        inodeCount: 8,
        operations: [
          { kind: 'create', path: '/a', size: 256, mode: 0o644 },
          { kind: 'create', path: '/b', size: 1024, mode: 0o644 },
          { kind: 'grow', path: '/a', size: 512 },
          { kind: 'shrink', path: '/b', size: 256 },
          { kind: 'delete', path: '/b' },
          { kind: 'grow', path: '/a', size: 512 },
        ],
      } satisfies FsInput,
      expectedOutcome:
        'The first grow is refused: /a sits in block 0 and needs block 1, which /b holds. Truncating /b frees blocks 2–4, but none of them is adjacent to /a, so the grow still fails. Only after /b is deleted does block 1 become free and the second grow succeeds — external fragmentation is about adjacency, not total free space.',
      discussion: [
        'Why do the three blocks freed by the truncation not help /a grow?',
        'How would linked or indexed allocation answer the very first grow request?',
        'What operation recovers the fragmented space into a usable run?',
      ],
      hints: [
        'Watch block 1 specifically — it is the only block that can extend /a in place.',
        'The free-run count and fragmentation metrics move each step; read them after every operation.',
      ],
    },
    {
      id: 'fs-index-block',
      title: 'When a file outgrows the direct pointers',
      scenario:
        'Store a 4000-byte file on a 256-byte-block volume under indexed allocation, with 12 direct pointers per inode.',
      difficulty: 'advanced',
      input: {
        allocation: 'indexed',
        blockCount: 24,
        blockSize: 256,
        inodeCount: 6,
        operations: [
          { kind: 'mkdir', path: '/data' },
          { kind: 'create', path: '/data/big', size: 4000, mode: 0o644 },
        ],
      } satisfies FsInput,
      expectedOutcome:
        '4000 bytes needs ⌈4000 ÷ 256⌉ = 16 data blocks. The inode stores 12 of those directly and pulls in one single-indirect index block for the other four, so the file occupies 17 blocks — the inode view shows the index pointer and the data pointers behind it.',
      discussion: [
        'How many data blocks could this inode address before a double-indirect pointer is needed?',
        'Why does the index block consume a whole block when it holds only four pointers in this run?',
      ],
      hints: ['An inode with 12 direct pointers and a 256-byte single-indirect block addresses 12 + 64 = 76 blocks.'],
    },
    {
      id: 'fs-inode-limit',
      title: 'Running out of inodes before space',
      scenario:
        'A 32-block volume has only a five-entry inode table; four files are created, then a fifth.',
      difficulty: 'intermediate',
      input: {
        allocation: 'indexed',
        blockCount: 32,
        blockSize: 256,
        inodeCount: 5,
        operations: [
          { kind: 'create', path: '/one', size: 100, mode: 0o644 },
          { kind: 'create', path: '/two', size: 100, mode: 0o644 },
          { kind: 'create', path: '/three', size: 100, mode: 0o644 },
          { kind: 'create', path: '/four', size: 100, mode: 0o644 },
          { kind: 'create', path: '/five', size: 100, mode: 0o644 },
        ],
      } satisfies FsInput,
      expectedOutcome:
        'Inode 0 is reserved for the root directory, so only four files fit; the fifth create is refused even though 28 blocks remain free. Deleting one file returns its inode to the free list and lets the next create succeed.',
      discussion: [
        'Why might a real file system be formatted with more inodes than a workload needs?',
        'How could you add a sixth file to this volume without adding blocks?',
      ],
      hints: ['Watch the free-inode count in the metrics, not the free-block count.'],
    },
  ],
};

/** An example plus the id of the lab that owns it. */
export interface LabbedExample extends EducationalExample<unknown> {
  readonly labId: string;
}

/** Flat list, useful for a future "browse all examples" view and for tests. */
export const ALL_EXAMPLES: readonly LabbedExample[] = Object.entries(EXAMPLES_BY_LAB).flatMap(
  ([labId, examples]) => examples.map((example): LabbedExample => ({ ...example, labId })),
);
