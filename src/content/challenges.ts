import type { Challenge } from '@/types';

/**
 * Practice challenges.
 *
 * A challenge is deliberately *not* a multiple-choice question. It states a task,
 * the evidence a correct answer must contain, and where the work can be done.
 * Challenges that reference a live lab can be attempted in the simulator;
 * challenges whose lab is still `planned` say so and are answered on paper.
 */
export const CHALLENGES: readonly Challenge[] = [
  /* ------------------------------------------------ Process management ---- */
  {
    id: 'challenge-lifecycle-trace',
    topicId: 'process-management',
    title: 'Trace one process end to end',
    prompt:
      'Write the full sequence of states a single process visits from creation to termination, and name the event that triggers each transition.',
    scenario:
      'A shell starts a program. The program reads a file (blocking once), is preempted once by the scheduler, and exits. Assume a single-CPU system with a round-robin scheduler.',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    labId: 'lab-process-lifecycle',
    requirements: [
      'List every state the process occupies, in order, including repeats.',
      'Name the trigger for each transition (fork, dispatch, timeout, I/O request, I/O completion, exit).',
      'State which transitions are caused by the scheduler and which by the process itself.',
    ],
    hints: [
      'A process can only request I/O while it is running.',
      'Being preempted returns a process to ready, not to new.',
    ],
    expectedOutcome:
      'Five states (new, ready, running, waiting, terminated) with the waiting and ready states visited twice — once around the I/O request, once around the preemption.',
    tags: ['state machine', 'pcb'],
  },
  {
    id: 'challenge-fork-count',
    topicId: 'process-management',
    title: 'Count the processes',
    prompt:
      'A program executes three consecutive fork() calls with no return-value check. State how many processes exist when the program finishes, and explain the doubling.',
    scenario: 'The parent process is the process started by the shell; assume no fork failures.',
    difficulty: 'intermediate',
    estimatedMinutes: 15,
    labId: 'lab-fork-exec',
    requirements: [
      'Give the exact number of processes at the end of the program.',
      'Explain the doubling rule and why it is exponential in the number of forks.',
      'Explain what copy-on-write changes about the cost of each fork.',
    ],
    hints: ['Each fork doubles the number of processes still executing the same code.'],
    expectedOutcome: '2³ = 8 processes, with copy-on-write making each fork cheap until a page is written.',
    tags: ['fork', 'copy-on-write'],
  },

  /* ----------------------------------------------------- CPU scheduling --- */
  {
    id: 'challenge-convoy-diagnosis',
    topicId: 'cpu-scheduling',
    title: 'Quantify the convoy effect',
    prompt:
      'Run the convoy workload under FCFS, then report every waiting time, the average, and explain which arrival pattern is responsible.',
    scenario:
      'A 12-unit CPU-bound job arrives at t = 0. Three 2-unit interactive jobs arrive at t = 1, 2 and 3.',
    difficulty: 'beginner',
    estimatedMinutes: 20,
    labId: 'lab-fcfs',
    requirements: [
      'Report the waiting time of all four processes.',
      'Report the average waiting time and compare it with the total burst time.',
      'State which property of FCFS causes the short jobs to wait.',
    ],
    hints: [
      'Waiting time = start time − arrival time.',
      'FCFS never preempts, so the long job runs to completion first.',
    ],
    expectedOutcome:
      'Waiting times 0, 11, 12 and 13; average 9.0 with a makespan of 18 — the three short jobs wait while one long job holds the CPU.',
    tags: ['fcfs', 'convoy effect'],
  },
  {
    id: 'challenge-quantum-tuning',
    topicId: 'cpu-scheduling',
    title: 'Choose a time quantum',
    prompt:
      'Sweep the Round Robin time quantum from 1 to 6 and identify the value that minimises average response time, then report what that choice costs.',
    scenario:
      'Four interactive processes arrive at nearly the same time, each needing 5 units of CPU. The system is judged on how quickly a process first gets the CPU.',
    difficulty: 'intermediate',
    estimatedMinutes: 25,
    labId: 'lab-round-robin',
    requirements: [
      'Tabulate average response time for each quantum you tried.',
      'Tabulate the number of time slices (a proxy for context-switch overhead) for each quantum.',
      'Justify a final recommendation as an explicit trade-off, not just "smaller is better".',
    ],
    hints: [
      'Response time is measured to the first dispatch, not to completion.',
      'A quantum larger than every burst makes Round Robin behave exactly like FCFS.',
    ],
    expectedOutcome:
      'Response time falls as the quantum shrinks while the slice count grows; a quantum near the shortest burst usually wins on responsiveness without exploding the switch count.',
    tags: ['round robin', 'quantum', 'trade-off'],
  },
  {
    id: 'challenge-sjf-counterexample',
    topicId: 'cpu-scheduling',
    title: 'Break the optimality of SJF',
    prompt:
      'SJF minimises average waiting time when every process is ready at t = 0. Construct an arrival pattern where it does not, and explain what the counterexample relies on.',
    scenario: 'A single CPU, non-preemptive SJF, three processes, integer arrival times and bursts.',
    difficulty: 'advanced',
    estimatedMinutes: 25,
    labId: 'lab-sjf',
    requirements: [
      'Give the arrival and burst times of every process.',
      'Compute average waiting time under SJF and under a competing policy.',
      'Explain why the optimality proof does not apply to that pattern.',
    ],
    hints: [
      'The proof exchanges adjacent ready jobs, so it assumes the set of ready jobs does not change.',
      'A job that arrives late cannot be seen by a non-preemptive scheduler that is already running something.',
    ],
    expectedOutcome:
      'A pattern with staggered arrivals where SJF makes an early choice that a preemptive policy (SRTF) or FCFS beats, showing that optimality is conditional on the arrival pattern.',
    tags: ['sjf', 'optimality', 'hard'],
  },

  /* -------------------------------------------------- Synchronization ---- */
  {
    id: 'challenge-lost-update',
    topicId: 'synchronization',
    title: 'Produce a lost update by hand',
    prompt:
      'Give an instruction-level interleaving of two threads that loses one increment of a shared counter, then show the interleaving that a mutex prevents.',
    scenario:
      'Two threads each execute `counter = counter + 1` once, where the operation compiles to load, add and store.',
    difficulty: 'intermediate',
    estimatedMinutes: 20,
    labId: 'lab-mutex',
    requirements: [
      'Show both instruction sequences side by side, step by step.',
      'Identify exactly which interleaving loses the update.',
      'Show the same scenario with a mutex and state which property of the mutex rules the bad interleaving out.',
    ],
    hints: [
      'The final value depends only on the order of the two store instructions.',
      'Mutual exclusion removes the interleaving, it does not make the increment atomic.',
    ],
    expectedOutcome:
      'Both loads happen before either store, so the second store overwrites the first; with a mutex the second thread cannot start its critical section until the first has unlocked.',
    tags: ['race condition', 'mutual exclusion'],
  },
  {
    id: 'challenge-buffer-deadlock',
    topicId: 'synchronization',
    title: 'Deadlock the bounded buffer',
    prompt:
      'Reorder the wait() calls in the producer/consumer solution so that the system deadlocks, and describe the cycle precisely.',
    scenario:
      'A buffer of size n guarded by mutex, empty and full semaphores, with at least one producer and one consumer.',
    difficulty: 'advanced',
    estimatedMinutes: 25,
    labId: 'lab-bounded-buffer',
    requirements: [
      'Give the modified producer and consumer code.',
      'State the state in which each process is blocked when the deadlock occurs.',
      'Explain why the deadlock can happen even though no single lock is held forever by one thread.',
    ],
    hints: [
      'Only one of the two orderings is unsafe, and it depends on which semaphore is acquired first.',
      'A thread can hold the mutex while blocking on a counting semaphore.',
    ],
    expectedOutcome:
      'The producer takes the mutex before checking for space and then blocks on empty while holding it, with the consumer blocked on the same mutex — a circular wait that no amount of waiting resolves.',
    tags: ['semaphore', 'deadlock', 'hard'],
  },

  /* -------------------------------------------------------- Deadlocks ---- */
  {
    id: 'challenge-safe-sequence',
    topicId: 'deadlocks',
    title: 'Find a safe sequence',
    prompt:
      'For the allocation given in the worked example, decide whether the state is safe, produce a safe sequence, then decide whether one specific request can be granted.',
    scenario:
      'Five processes share three resource types. Available, allocation and maximum matrices are given in the lab example.',
    difficulty: 'advanced',
    estimatedMinutes: 30,
    labId: 'lab-bankers',
    requirements: [
      'Show need = maximum − allocation for every process.',
      'Produce a safe sequence or prove that none exists.',
      'Justify the decision on the pending request by the safety test, not by intuition.',
    ],
    hints: [
      'A process can finish when its need is covered by the current work vector.',
      'On completion its allocation returns to the work vector.',
    ],
    expectedOutcome:
      'A safe sequence exists for the base state; the pending request is granted only if the state stays safe after the tentative allocation.',
    tags: ['bankers algorithm', 'safe state', 'hard'],
  },
  {
    id: 'challenge-cycle-vs-deadlock',
    topicId: 'deadlocks',
    title: 'Cycle does not always mean deadlock',
    prompt:
      'Construct a resource-allocation graph with a cycle that is not a deadlock, and explain what has to be true for a cycle to prove deadlock.',
    scenario: 'Resource types with multiple instances are allowed.',
    difficulty: 'advanced',
    estimatedMinutes: 25,
    labId: 'lab-wait-for-graph',
    requirements: [
      'Draw or describe the graph including instance counts.',
      'Identify the cycle and explain why the system can still make progress.',
      'State the exact condition under which a cycle is sufficient to prove deadlock.',
    ],
    hints: ['Draw the graph with resource nodes, not just process nodes.'],
    expectedOutcome:
      'A cycle through a resource type that has a free instance is not a deadlock; the cycle is necessary and sufficient only when every resource type in it has a single instance.',
    tags: ['wait-for graph', 'detection'],
  },

  /* ----------------------------------------------- Memory management ----- */
  {
    id: 'challenge-fragmentation-audit',
    topicId: 'memory-management',
    title: 'Prove external fragmentation',
    prompt:
      'Allocate and free a sequence of memory requests so that a 300 KB request fails while total free space exceeds 300 KB, then show what compaction would recover.',
    scenario: 'A 1 MB memory map with four processes of 100, 200, 300 and 400 KB in a chosen order of allocation and release.',
    difficulty: 'intermediate',
    estimatedMinutes: 25,
    labId: 'lab-contiguous-allocation',
    requirements: [
      'Give the memory map before the failing request, with hole sizes.',
      'Report total free space and the size of the largest usable hole.',
      'Explain why first fit, best fit and worst fit can all fail on the same request.',
    ],
    hints: [
      'Track every hole, not just the total free space.',
      'Total free space is not the same as contiguous free space.',
    ],
    expectedOutcome:
      'Total free space is sufficient but fragmented into holes smaller than 300 KB, so all three placement strategies fail until compaction merges them.',
    tags: ['fragmentation', 'first fit'],
  },
  {
    id: 'challenge-buddy-rounding',
    topicId: 'memory-management',
    title: 'Measure buddy allocator waste',
    prompt:
      'For a workload of 64 KB, 100 KB and 300 KB requests against a 1 MB buddy heap, compute the block returned for each request and the internal fragmentation it creates.',
    scenario: 'The heap starts as a single 1 MB block and no block is ever released.',
    difficulty: 'intermediate',
    estimatedMinutes: 20,
    labId: 'lab-buddy-system',
    requirements: [
      'Give the allocated block size for each request.',
      'Give the internal fragmentation per request and in total.',
      'Explain why rounding up is what makes splitting and coalescing cheap.',
    ],
    hints: ['Every block size is a power of two, and requests round up.'],
    expectedOutcome:
      '64 KB exact, 100 KB → 128 KB (28 KB wasted), 300 KB → 512 KB (212 KB wasted): 240 KB of internal fragmentation for 464 KB requested.',
    tags: ['buddy allocator', 'internal fragmentation'],
  },

  /* ---------------------------------------------------- Virtual memory --- */
  {
    id: 'challenge-belady-anomaly',
    topicId: 'virtual-memory',
    title: 'Reproduce Bélády’s anomaly',
    prompt:
      'Give a reference string and a frame count for which FIFO produces more page faults with four frames than with three.',
    scenario: 'Integer page numbers, three and four frames, FIFO replacement only.',
    difficulty: 'advanced',
    estimatedMinutes: 30,
    labId: 'lab-page-replacement',
    requirements: [
      'Give the full reference string.',
      'Show the fault count for three frames and for four frames, with the frame contents after each reference.',
      'Explain why LRU cannot exhibit the same anomaly.',
    ],
    hints: [
      'The classic string is short and deliberately revisits an early page.',
      'The anomaly comes from FIFO ignoring how often a page is used, not from the extra frame.',
    ],
    expectedOutcome:
      'A string such as 1 2 3 4 1 2 5 1 2 3 4 5 faults 9 times with three frames and 10 times with four — adding memory made things worse.',
    tags: ['fifo', 'belady anomaly', 'hard'],
  },
  {
    id: 'challenge-effective-access-time',
    topicId: 'virtual-memory',
    title: 'Cost a TLB miss',
    prompt:
      'Compute effective access time for a two-level page table with a 98% TLB hit rate, then recompute it at 80% and explain the change.',
    scenario:
      'A TLB lookup costs 10 ns, a memory access costs 100 ns, and a TLB miss requires walking two levels of page table.',
    difficulty: 'advanced',
    estimatedMinutes: 25,
    labId: 'lab-tlb-translation',
    requirements: [
      'State the number of extra memory accesses on a TLB miss.',
      'Give the effective access time at both hit rates.',
      'Quantify how much of the slowdown comes from the page-table walk alone.',
    ],
    hints: [
      'EAT = hit rate × hit cost + miss rate × miss cost.',
      'A two-level walk costs one memory access per level before the data access.',
    ],
    expectedOutcome:
      'A hit costs 10 + 100 = 110 ns; a miss costs 10 + 100 + 100 + 100 = 310 ns because of the two-level walk. Effective access time rises from about 114 ns at a 98% hit rate to about 150 ns at 80%, and 200 ns of every miss is pure page-table walking.',
    tags: ['tlb', 'effective access time', 'hard'],
  },

  /* --------------------------------------------------- Disk scheduling --- */
  {
    id: 'challenge-scan-direction',
    topicId: 'disk-scheduling',
    title: 'Does head direction matter?',
    prompt:
      'For a given request queue, compute total head movement under SCAN starting in the increasing direction and again starting in the decreasing direction, and decide whether the choice matters.',
    scenario:
      'Cylinders 0–199, head starting at cylinder 53, queue 98, 183, 37, 122, 14, 124, 65, 67.',
    difficulty: 'intermediate',
    estimatedMinutes: 25,
    labId: 'lab-disk-scheduling',
    requirements: [
      'Give total head movement for both initial directions.',
      'Identify which request is serviced last in each case.',
      'State the rule you would use to choose the direction in a real system.',
    ],
    hints: [
      'SCAN travels to the end of the disk before reversing, so the initial direction decides the first sweep.',
      'The last request serviced is the one furthest against the initial direction.',
    ],
    expectedOutcome:
      'The two directions give different totals and different worst-case waits, which is why real schedulers pick the direction based on recently completed requests.',
    tags: ['scan', 'seek distance'],
  },
  {
    id: 'challenge-sstf-starvation',
    topicId: 'disk-scheduling',
    title: 'Starve a request with SSTF',
    prompt:
      'Construct a stream of arriving requests that keeps SSTF from ever servicing one chosen cylinder.',
    scenario: 'Cylinders 0–199 with requests arriving while the head is still serving the previous one.',
    difficulty: 'advanced',
    estimatedMinutes: 25,
    labId: 'lab-disk-scheduling',
    requirements: [
      'Give the request stream and the starved cylinder.',
      'Show the head position after each service and why the starved request is never nearest.',
      'State how SCAN or C-SCAN removes the possibility.',
    ],
    hints: [
      'Keep a steady supply of requests clustering around the head.',
      'The starved request should sit at the extreme edge of the disk.',
    ],
    expectedOutcome:
      'A dense cluster near the head plus one distant request that is never the closest: SSTF is greedy and has no fairness guarantee, while SCAN bounds every wait by one full sweep.',
    tags: ['sstf', 'starvation', 'hard'],
  },

  /* ----------------------------------------------------- File systems ---- */
  {
    id: 'challenge-inode-walk',
    topicId: 'file-systems',
    title: 'Walk an inode to a byte',
    prompt:
      'Given a block size of 4 KB, 12 direct pointers, one single-indirect and one double-indirect pointer, determine how a lookup at byte offset 5 000 000 is resolved and how many disk reads it costs.',
    scenario:
      'Each pointer is 4 bytes. Ignore caching and assume the inode itself is already in memory.',
    difficulty: 'advanced',
    estimatedMinutes: 30,
    labId: 'lab-file-allocation',
    requirements: [
      'State how many data blocks the direct pointers cover and how many a single-indirect block covers.',
      'Name the pointer level that contains the target block.',
      'Count the metadata reads required before the data read.',
    ],
    hints: [
      'A 4 KB indirect block holds 4096 / 4 = 1024 pointers.',
      'Direct covers 12 blocks = 48 KB; single indirect covers 1024 blocks = 4 MB.',
    ],
    expectedOutcome:
      '5 000 000 bytes is past 4 MB, so the block sits in the double-indirect region, costing two index-block reads plus the data read.',
    tags: ['inode', 'indexed allocation', 'hard'],
  },
];

export const CHALLENGES_BY_ID: ReadonlyMap<string, Challenge> = new Map(
  CHALLENGES.map((challenge) => [challenge.id, challenge]),
);
