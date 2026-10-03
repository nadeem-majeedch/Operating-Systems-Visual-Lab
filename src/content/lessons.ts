import type { GuidedLesson, LessonStageKind } from '@/types';

/**
 * Guided lessons — one per learning area.
 *
 * Every lesson follows the same six stages in the same order: concept →
 * visualization → experiment → walkthrough → challenge → reflection. The stage
 * content lives inside each stage, so the lesson view is a single map over
 * `stages` with no per-topic branching. Text is deliberately short and aimed at
 * undergraduate CS / Data Science students, and each stage links to the real lab
 * and graded challenge bank rather than talking about them abstractly.
 */
export const LESSON_STAGE_ORDER: readonly LessonStageKind[] = [
  'concept',
  'visualization',
  'experiment',
  'walkthrough',
  'challenge',
  'reflection',
];

export const LESSONS: readonly GuidedLesson[] = [
  /* ------------------------------------------------------------------- */
  /* 1. Process management                                               */
  /* ------------------------------------------------------------------- */
  {
    topicId: 'process-management',
    title: 'How processes live and die',
    subtitle: 'States, the PCB, and what a context switch really costs.',
    difficulty: 'beginner',
    estimatedMinutes: 30,
    prerequisites: [],
    objectives: [
      'Name the five process states and the legal transition between any two of them.',
      'Explain what a PCB stores and why it is the unit of a context switch.',
      'Trace a process that blocks on I/O and is resumed later.',
      'Describe how a child process relates to its parent.',
    ],
    keyTerms: [
      { term: 'Process', definition: 'A program in execution, with its own address space and PCB.' },
      { term: 'PCB', definition: 'Process Control Block — the kernel’s record of one process: PID, state, registers, priority, timings.' },
      { term: 'Context switch', definition: 'Saving one process’s context and restoring another’s when the CPU changes hands.' },
      { term: 'Preemption', definition: 'Taking the CPU away from a running process before it finishes, moving it back to ready.' },
      { term: 'Copy-on-write', definition: 'A fork shares memory pages until one process writes to them, then copies only the changed page.' },
    ],
    commonMistakes: [
      { mistake: 'Thinking a process can jump straight from waiting back to running.', correction: 'It must be unblocked to ready first; only the scheduler may dispatch it.' },
      { mistake: 'Believing blocking wastes the CPU.', correction: 'Blocking is exactly what frees the CPU for another process instead of leaving it idle.' },
      { mistake: 'Counting the first dispatch as a context switch.', correction: 'A switch needs a previous process to save; dispatching onto an idle CPU saves nothing.' },
    ],
    stages: [
      {
        kind: 'concept',
        title: 'Concept: a program in motion',
        summary: 'Five states, one state machine, and the kernel’s bookkeeping.',
        estimatedMinutes: 6,
        intro:
          'A program on disk is a file. A process is that program running: the OS gives it a PID, an address space and a PCB, then moves it between five states as its needs change.',
        points: [
          'A process is always in exactly one state: new, ready, running, waiting or terminated.',
          'The only exits from running are preempt (back to ready), block (to waiting) and terminate.',
          'The PCB is everything the kernel must remember — including the state and registers — so the process can be paused and resumed.',
          'Switching the CPU between two processes is a context switch: save the old registers, load the new ones.',
        ],
      },
      {
        kind: 'visualization',
        title: 'Visualization: the state machine in motion',
        summary: 'Watch one process move while the PCB stays in view.',
        estimatedMinutes: 6,
        labId: 'lab-process-lifecycle',
        note: 'Open the Process Lifecycle lab and step slowly. The state diagram highlights the edge just traversed, so you can connect each button press to a transition.',
        focus: [
          'Which edge lights up after each action, and which process triggered it.',
          'How cpuTime grows while running but waitingTime grows while ready or waiting.',
          'The event log: it names the cause of every transition.',
        ],
      },
      {
        kind: 'experiment',
        title: 'Experiment: block, then resume',
        summary: 'Make a process give up the CPU on purpose.',
        estimatedMinutes: 8,
        labId: 'lab-process-lifecycle',
        setup:
          'Load the “Block on I/O” scene. Dispatch P1, run it for 1 unit, then block it. Schedule P2, then complete P1’s I/O.',
        observations: [
          'P1 moves running → waiting, and the CPU is handed to P2 rather than left idle.',
          'Completing the I/O moves P1 to ready — not running — so it waits for its next turn.',
          'Exactly one context switch is counted for the whole handover.',
        ],
      },
      {
        kind: 'walkthrough',
        title: 'Walkthrough: one process, start to finish',
        summary: 'A five-step trace you can replay in the lab.',
        estimatedMinutes: 6,
        steps: [
          { title: 'Create', detail: 'The kernel builds a PCB and the process sits in new. It is not competing for the CPU yet.' },
          { title: 'Admit', detail: 'The process moves new → ready and joins the ready queue.' },
          { title: 'Dispatch', detail: 'The scheduler moves it ready → running. The CPU loads its saved context and begins executing.' },
          { title: 'Block on I/O', detail: 'A disk read moves it running → waiting. Another ready process is dispatched in its place.' },
          { title: 'Unblock, then exit', detail: 'I/O completes (waiting → ready), it is dispatched again, and its final instruction moves it to terminated.' },
        ],
      },
      {
        kind: 'challenge',
        title: 'Challenge: prove you can trace it',
        summary: 'Graded questions on states, transitions and context switches.',
        estimatedMinutes: 4,
        bankIds: ['process-management'],
        note: 'Answer a few questions from the Process Management bank. Every expected answer is read out of the same engine you just used, so you can check yourself in the lab.',
      },
      {
        kind: 'reflection',
        title: 'Reflection',
        summary: 'Say it back in your own words.',
        estimatedMinutes: 2,
        prompts: [
          'Why can a process not go straight from waiting to running?',
          'What exactly is saved and restored during a context switch, and why is it pure overhead?',
          'Give a real program you use that spends most of its life waiting, and explain what the OS does in the meantime.',
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------- */
  /* 2. CPU scheduling                                                    */
  /* ------------------------------------------------------------------- */
  {
    topicId: 'cpu-scheduling',
    title: 'Who runs next?',
    subtitle: 'Scheduling policies, and the three numbers that score them.',
    difficulty: 'beginner',
    estimatedMinutes: 35,
    prerequisites: ['process-management'],
    objectives: [
      'Distinguish preemptive from non-preemptive scheduling.',
      'Compute turnaround, waiting and response time for every process in a run.',
      'Explain the convoy effect and why shortest-first can starve a long job.',
      'Choose a time quantum for Round Robin and justify the trade-off.',
    ],
    keyTerms: [
      { term: 'Burst time', definition: 'How much CPU work a process needs before it finishes or blocks.' },
      { term: 'Turnaround time', definition: 'Completion − arrival: the total time the process spent in the system.' },
      { term: 'Waiting time', definition: 'Turnaround − burst: time spent ready but not on the CPU.' },
      { term: 'Response time', definition: 'First dispatch − arrival: how long until a process first runs.' },
      { term: 'Time quantum', definition: 'The slice of CPU a Round Robin process gets before it is rotated to the back.' },
      { term: 'Convoy effect', definition: 'Many short jobs stuck behind one long one, inflating average waiting time.' },
    ],
    commonMistakes: [
      { mistake: 'Mixing up turnaround and waiting time.', correction: 'Turnaround counts from arrival to completion; waiting subtracts the time actually run.' },
      { mistake: 'Assuming SJF is always optimal.', correction: 'It is optimal only when every job is ready together; staggered arrivals break the proof.' },
      { mistake: 'Thinking a huge Round Robin quantum is fine.', correction: 'A quantum larger than every burst turns Round Robin into FCFS and destroys responsiveness.' },
    ],
    stages: [
      {
        kind: 'concept',
        title: 'Concept: scoring a schedule',
        summary: 'Throughput, turnaround, waiting and response.',
        estimatedMinutes: 7,
        intro:
          'The CPU can run only one process at a time, so the scheduler’s order changes how long everyone waits. Three numbers measure the result: turnaround, waiting and response time.',
        points: [
          'Non-preemptive policies let a running process finish; preemptive ones can take the CPU back.',
          'FCFS is fair in arrival order but suffers the convoy effect.',
          'SJF minimises average waiting time for simultaneous arrivals; SRTF preempts for the same reason.',
          'Round Robin trades context switches for responsiveness; priority trades fairness for urgency.',
        ],
      },
      {
        kind: 'visualization',
        title: 'Visualization: build a Gantt chart',
        summary: 'See the geometry of a schedule before doing any arithmetic.',
        estimatedMinutes: 6,
        labId: 'lab-fcfs',
        note: 'Open the FCFS lab, press play, and watch the Gantt chart fill one dispatch at a time. Every metric tile updates with the step that produced it.',
        focus: [
          'How idle gaps appear when nothing has arrived yet.',
          'The difference between a process’s start time and its arrival time.',
          'How the running average updates as each process completes.',
        ],
      },
      {
        kind: 'experiment',
        title: 'Experiment: the quantum vs response time',
        summary: 'Sweep the quantum and watch the trade-off.',
        estimatedMinutes: 9,
        labId: 'lab-round-robin',
        setup:
          'In the Round Robin lab, use four processes of 4 units each arriving at t = 0. Try quantum 1, then 2, then 8.',
        observations: [
          'Average response time is smallest for the smallest quantum.',
          'The context-switch count climbs as the quantum shrinks.',
          'At a quantum larger than 4 the schedule collapses to FCFS and everything waits behind P1.',
        ],
      },
      {
        kind: 'walkthrough',
        title: 'Walkthrough: SJF on a batch',
        summary: 'Work one schedule by hand, then verify it.',
        estimatedMinutes: 7,
        steps: [
          { title: 'List the arrivals', detail: 'P1(0,5), P2(0,3), P3(0,8): all ready at t = 0, so the policy can reorder them freely.' },
          { title: 'Order by burst', detail: 'SJF picks P2 (3), then P1 (5), then P3 (8).' },
          { title: 'Read the completion times', detail: 'P2 finishes at 3, P1 at 8, P3 at 16.' },
          { title: 'Compute waiting times', detail: 'Waiting = completion − arrival − burst: P2 → 0, P1 → 3, P3 → 8.' },
          { title: 'Compare with FCFS', detail: 'FCFS runs in arrival order and averages 4.33 waiting against SJF’s 3.67 — reordering paid off.' },
        ],
      },
      {
        kind: 'challenge',
        title: 'Challenge: predict and compute',
        summary: 'Numerical and prediction questions across the policies.',
        estimatedMinutes: 4,
        bankIds: ['cpu-scheduling'],
        note: 'Try the CPU Scheduling bank. Numerical answers ask for a value the engine computes; prediction questions ask which process runs or finishes next.',
      },
      {
        kind: 'reflection',
        title: 'Reflection',
        summary: 'Connect the metrics to real behaviour.',
        estimatedMinutes: 2,
        prompts: [
          'When would you deliberately accept a longer average waiting time for a better response time?',
          'Why does SRTF perform more context switches than SJF?',
          'Sketch an arrival pattern where FCFS beats SJF on average waiting time.',
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------- */
  /* 3. Synchronization                                                   */
  /* ------------------------------------------------------------------- */
  {
    topicId: 'synchronization',
    title: 'Making concurrent code correct',
    subtitle: 'Race conditions, critical sections, mutexes and semaphores.',
    difficulty: 'intermediate',
    estimatedMinutes: 35,
    prerequisites: ['process-management'],
    objectives: [
      'Explain why a non-atomic read-modify-write can lose updates.',
      'State the three requirements of a correct critical-section solution.',
      'Use counting semaphores to bound a producer/consumer buffer.',
      'Recognise why the order of wait() calls can deadlock a program.',
    ],
    keyTerms: [
      { term: 'Race condition', definition: 'A result that depends on the timing of concurrent accesses to shared data.' },
      { term: 'Critical section', definition: 'Code that touches shared state and must not run in more than one thread at a time.' },
      { term: 'Mutual exclusion', definition: 'The guarantee that at most one thread is inside a critical section.' },
      { term: 'Semaphore', definition: 'A counter with wait() and signal(); wait() blocks when the count would go negative.' },
      { term: 'Atomicity', definition: 'An operation that either completes fully or not at all, with no interleaving in between.' },
      { term: 'Starvation', definition: 'A thread that is runnable but never scheduled, because others keep overtaking it.' },
    ],
    commonMistakes: [
      { mistake: 'Assuming a single increment is atomic.', correction: 'It compiles to load, add and store — three steps another thread can interrupt.' },
      { mistake: 'Thinking a mutex makes an operation instant.', correction: 'A mutex serialises access; it removes concurrency, it does not speed anything up.' },
      { mistake: 'Acquiring a mutex before checking a counting semaphore.', correction: 'That can hold the lock while blocking, which is how the bounded buffer deadlocks.' },
    ],
    stages: [
      {
        kind: 'concept',
        title: 'Concept: the lost update',
        summary: 'Three instructions, two threads, one wrong answer.',
        estimatedMinutes: 7,
        intro:
          'Shared data plus interleaving equals trouble. Two threads incrementing the same counter can both read the old value and both write it back, so one update disappears even though nothing “crashed”.',
        points: [
          'A critical section must guarantee mutual exclusion, progress and bounded waiting.',
          'A mutex is a binary lock: lock before the section, unlock after.',
          'A counting semaphore models capacity — how many of a resource are free.',
          'The order in which you acquire multiple semaphores decides whether the system can deadlock.',
        ],
      },
      {
        kind: 'visualization',
        title: 'Visualization: watch an update vanish',
        summary: 'Step through load–add–store instruction by instruction.',
        estimatedMinutes: 6,
        labId: 'lab-mutex',
        note: 'Open the Critical Sections lab in “Unsafe” mode and step one instruction at a time. The register panel shows each thread’s private copy of the counter.',
        focus: [
          'When both threads load the counter before either stores it.',
          'How the final counter is lower than the number of increments.',
          'What changes the moment a mutex wraps the critical section.',
        ],
      },
      {
        kind: 'experiment',
        title: 'Experiment: bound the buffer',
        summary: 'Drive producers and consumers and find the limit.',
        estimatedMinutes: 9,
        labId: 'lab-bounded-buffer',
        setup:
          'In the Bounded Buffer lab, run two producers and one consumer over a two-slot buffer, then watch the empty and full semaphores.',
        observations: [
          'A producer blocks exactly when the buffer is full — the buffer never overflows.',
          'The consumer’s signal on empty wakes a blocked producer.',
          'mutex is held only for the array access, never while waiting on a semaphore.',
        ],
      },
      {
        kind: 'walkthrough',
        title: 'Walkthrough: a lost update, repaired',
        summary: 'Reproduce the bug, then fix it.',
        estimatedMinutes: 7,
        steps: [
          { title: 'Two increments each', detail: 'Two threads each run counter = counter + 1 twice, so the correct total is 4.' },
          { title: 'Interleave the loads', detail: 'Both loads read 0 before either store runs.' },
          { title: 'Watch both stores', detail: 'The first store writes 1; the second overwrites it with 1, losing an update.' },
          { title: 'Add the lock', detail: 'A mutex lets only one thread run the whole load–add–store triple at a time.' },
          { title: 'Check the total', detail: 'The counter now reaches exactly 4, and both threads still make progress.' },
        ],
      },
      {
        kind: 'challenge',
        title: 'Challenge: race and buffer questions',
        summary: 'Graded checks on lost updates and semaphore counts.',
        estimatedMinutes: 4,
        bankIds: ['race-conditions', 'producer-consumer'],
        note: 'Work through the Race Conditions and Producer/Consumer banks. Each answer is measured from the same engines you just ran.',
      },
      {
        kind: 'reflection',
        title: 'Reflection',
        summary: 'Reason about correctness, not just output.',
        estimatedMinutes: 2,
        prompts: [
          'Why is “it passed once” not evidence that concurrent code is correct?',
          'What are the three requirements of a critical-section solution, in your own words?',
          'Describe a change to the producers/consumers that would deadlock the buffer, and explain the cycle.',
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------- */
  /* 4. Deadlocks                                                         */
  /* ------------------------------------------------------------------- */
  {
    topicId: 'deadlocks',
    title: 'When progress stops for good',
    subtitle: 'Coffman conditions, wait-for graphs and safe states.',
    difficulty: 'advanced',
    estimatedMinutes: 40,
    prerequisites: ['synchronization'],
    objectives: [
      'List the four Coffman conditions and find each in a scenario.',
      'Detect deadlock with a wait-for graph, and say when a cycle proves it.',
      'Apply the safety algorithm from the banker’s algorithm.',
      'Distinguish unsafe from deadlocked.',
    ],
    keyTerms: [
      { term: 'Deadlock', definition: 'A set of processes each waiting for a resource another holds, so none can proceed.' },
      { term: 'Coffman conditions', definition: 'Mutual exclusion, hold and wait, no preemption and circular wait — all four are required.' },
      { term: 'Wait-for graph', definition: 'A graph of process → process waits, used for single-instance detection.' },
      { term: 'Safe state', definition: 'A state from which some completion order exists for every process.' },
      { term: 'Avoidance', definition: 'Refusing a request that would make the state unsafe, before any deadlock forms.' },
    ],
    commonMistakes: [
      { mistake: 'Treating “unsafe” as “deadlocked”.', correction: 'Unsafe only means no guaranteed completion order under worst-case demands; no deadlock need occur.' },
      { mistake: 'Using a cycle to prove deadlock with multiple instances.', correction: 'A cycle is sufficient only when every resource in it has a single instance.' },
      { mistake: 'Thinking detection prevents deadlock.', correction: 'Detection notices an existing deadlock; avoidance keeps the system out of unsafe states in the first place.' },
    ],
    stages: [
      {
        kind: 'concept',
        title: 'Concept: four conditions, one deadlock',
        summary: 'Why progress can stop permanently.',
        estimatedMinutes: 8,
        intro:
          'Deadlock is not a crash — it is a system frozen in a state where every participant is waiting. All four Coffman conditions must hold at once, so breaking any one of them makes deadlock impossible.',
        points: [
          'Mutual exclusion, hold and wait, no preemption and circular wait — all four together.',
          'Prevention breaks a condition up front; avoidance checks safety on each request.',
          'A wait-for graph proves deadlock for single-instance resources when it contains a cycle.',
          'With multiple instances, the reduction algorithm is needed; a cycle alone is not enough.',
        ],
      },
      {
        kind: 'visualization',
        title: 'Visualization: spot the cycle',
        summary: 'Build a resource graph and collapse it into waits.',
        estimatedMinutes: 6,
        labId: 'lab-wait-for-graph',
        note: 'Open the Resource & Wait-for Graph lab and step until the graph collapses into process → process edges. The cycle is highlighted as it forms.',
        focus: [
          'Which request edges close the loop.',
          'How the collapsed wait-for graph hides the resource nodes.',
          'Why the multi-instance example shows a cycle that is not a deadlock.',
        ],
      },
      {
        kind: 'experiment',
        title: 'Experiment: grant or defer?',
        summary: 'Ask the banker and watch the rollback.',
        estimatedMinutes: 10,
        labId: 'lab-bankers',
        setup:
          'In the Banker’s Algorithm lab, load the classic state, then request [1,0,2] for P1, and afterwards [3,3,0] for P4.',
        observations: [
          'The first request survives the safety check and is granted.',
          'The second fails it, so the tentative allocation is rolled back and P4 waits.',
          'The allocation table is identical before and after a deferred request.',
        ],
      },
      {
        kind: 'walkthrough',
        title: 'Walkthrough: the safety algorithm',
        summary: 'Find a safe sequence by hand.',
        estimatedMinutes: 8,
        steps: [
          { title: 'Compute need', detail: 'need = max − allocation for every process, resource by resource.' },          { title: 'Start from available', detail: 'work begins as the available vector, [3,3,2] in the classic state.' },
          { title: 'Find a fit', detail: 'Any process whose need ≤ work can finish; P1 fits first.' },
          { title: 'Release and repeat', detail: 'On finishing, its allocation returns to work and the process is marked done.' },
          { title: 'Conclude', detail: 'If every process finishes, the state is safe; a full sequence exists, otherwise it is unsafe.' },
        ],
      },
      {
        kind: 'challenge',
        title: 'Challenge: safety and cycles',
        summary: 'Graded questions on safe states and graphs.',
        estimatedMinutes: 4,
        bankIds: ['bankers-algorithm', 'wait-for-graph'],
        note: 'Answer questions from both deadlock banks. They ask for safe-sequence lengths, request outcomes and cycle lengths — all derived from the engines.',
      },
      {
        kind: 'reflection',
        title: 'Reflection',
        summary: 'Weigh detection against avoidance.',
        estimatedMinutes: 2,
        prompts: [
          'Give a concrete way to break each Coffman condition in a real system.',
          'Why does the banker’s algorithm cost throughput, and when is that acceptable?',
          'Construct a wait-for graph with a cycle that is not a deadlock.',
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------- */
  /* 5. Memory management                                                 */
  /* ------------------------------------------------------------------- */
  {
    topicId: 'memory-management',
    title: 'Fitting processes into memory',
    subtitle: 'Placement strategies, fragmentation and compaction.',
    difficulty: 'intermediate',
    estimatedMinutes: 35,
    prerequisites: ['process-management'],
    objectives: [
      'Apply first-fit, best-fit, worst-fit and next-fit placement.',
      'Tell internal fragmentation apart from external fragmentation.',
      'Explain when a request fails even though total free memory is enough.',
      'Decide when compaction is worth its cost.',
    ],
    keyTerms: [
      { term: 'Partition', definition: 'A contiguous region of memory assigned to one process.' },
      { term: 'Hole', definition: 'A free block between allocated regions.' },
      { term: 'First fit', definition: 'Take the first hole large enough.' },
      { term: 'Best fit', definition: 'Take the smallest hole that still fits.' },
      { term: 'External fragmentation', definition: 'Plenty of total free memory, but scattered in holes too small to use.' },
      { term: 'Internal fragmentation', definition: 'Wasted space trapped inside an allocated partition.' },
      { term: 'Compaction', definition: 'Sliding resident processes together to merge holes into one large block.' },
    ],
    commonMistakes: [
      { mistake: 'Using total free memory to decide whether a request fits.', correction: 'What matters is the largest single hole, not the sum of all holes.' },
      { mistake: 'Confusing the two fragmentation types.', correction: 'Internal waste lives inside a used partition; external waste is unusable space between partitions.' },
      { mistake: 'Assuming more free memory always helps.', correction: 'More scattered free memory can be less useful than a single contiguous run.' },
    ],
    stages: [
      {
        kind: 'concept',
        title: 'Concept: the placement problem',
        summary: 'Where should a new process go?',
        estimatedMinutes: 7,
        intro:
          'Memory is finite and processes come and go, so the allocator must choose a hole for each request. The choice changes how quickly the free space fragments into unusable slivers.',
        points: [
          'Fixed partitions are decided up front; variable partitions are carved out on demand.',
          'First fit is fast, best fit minimises immediate waste, worst fit keeps big holes usable.',
          'External fragmentation is about adjacency; internal fragmentation is about wasted space inside a block.',
          'Compaction merges holes but copies every resident process, so it is not free.',
        ],
      },
      {
        kind: 'visualization',
        title: 'Visualization: a memory map over time',
        summary: 'Watch holes appear, split and merge.',
        estimatedMinutes: 6,
        labId: 'lab-contiguous-allocation',
        note: 'Open Contiguous Allocation & Fragmentation. Allocate and free a few processes and watch the map redraw after every operation; the metrics show free blocks and the largest hole.',
        focus: [
          'How a freed block merges with an adjacent free block.',
          'The gap between total free memory and the largest usable hole.',
          'How the same request lands in a different place under a different policy.',
        ],
      },
      {
        kind: 'experiment',
        title: 'Experiment: waste inside partitions',
        summary: 'Measure internal fragmentation directly.',
        estimatedMinutes: 8,
        labId: 'lab-fixed-partitions',
        setup:
          'Switch to Fixed Partitions, use four 250-unit partitions and admit four 200-unit processes.',        observations: [
          'Each process occupies a whole 250-unit partition while using only 200.',
          'The internal-fragmentation metric totals 200 units — 50 per partition.',
          'No external fragmentation appears, because every partition is exactly accounted for.',
        ],
      },
      {
        kind: 'walkthrough',
        title: 'Walkthrough: fragmentation and compaction',
        summary: 'A request that fails, then succeeds.',
        estimatedMinutes: 7,
        steps: [
          { title: 'Create three holes', detail: 'Allocate A(300), X(150), B(300), Y(150), C(300), then free A, B and C, leaving three 300-unit holes.' },
          { title: 'Request 800 units', detail: 'Total free memory is 900, but no single hole is large enough, so the request fails.' },
          { title: 'Name the problem', detail: 'This is external fragmentation: the free space exists but is not contiguous.' },
          { title: 'Compact', detail: 'The resident processes slide together and the free space becomes one 900-unit block.' },
          { title: 'Retry', detail: 'The same 800-unit request now succeeds — at the cost of copying every resident process.' },
        ],
      },
      {
        kind: 'challenge',
        title: 'Challenge: placement and fragmentation',
        summary: 'Graded questions on addresses and hole sizes.',
        estimatedMinutes: 4,
        bankIds: ['placement', 'fragmentation'],
        note: 'Try the Placement and Fragmentation banks. Addresses and fragmentation totals are read out of the memory engine, so each answer is reproducible in the lab.',
      },
      {
        kind: 'reflection',
        title: 'Reflection',
        summary: 'Reason about real systems.',
        estimatedMinutes: 2,
        prompts: [
          'Why do real kernels often allocate in power-of-two blocks?',
          'When is compaction worth the copying cost, and when is it not?',
          'Which placement policy would you choose for a long-running server, and why?',
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------- */
  /* 6. Virtual memory                                                    */
  /* ------------------------------------------------------------------- */
  {
    topicId: 'virtual-memory',
    title: 'Pretending memory is bigger than it is',
    subtitle: 'Paging, the TLB, page faults and replacement.',
    difficulty: 'advanced',
    estimatedMinutes: 45,
    prerequisites: ['memory-management'],
    objectives: [
      'Split a logical address into a page number and an offset.',
      'Translate a page number to a frame through the TLB and page table.',
      'Explain the difference between a TLB miss and a page fault.',
      'Compare FIFO, LRU, OPT and Clock and explain Bélády’s anomaly.',
    ],
    keyTerms: [
      { term: 'Page', definition: 'A fixed-size block of a virtual address space.' },
      { term: 'Frame', definition: 'A same-sized block of physical memory that holds one page.' },
      { term: 'Page table', definition: 'The per-process map from page number to frame.' },
      { term: 'TLB', definition: 'A small hardware cache of recent page-to-frame translations.' },
      { term: 'Page fault', definition: 'A reference to a page not currently in memory, which the OS must load.' },
      { term: 'Bélády’s anomaly', definition: 'FIFO occasionally faults more page faults with more frames.' },
    ],
    commonMistakes: [
      { mistake: 'Treating a TLB miss as a page fault.', correction: 'A TLB miss just walks the page table; a page fault means the page is not in memory at all.' },
      { mistake: 'Thinking the offset changes during translation.', correction: 'Only the page number is translated; the offset is copied through unchanged.' },
      { mistake: 'Assuming more frames always means fewer faults.', correction: 'That holds for LRU and OPT as stack algorithms, but not for FIFO.' },
    ],
    stages: [
      {
        kind: 'concept',
        title: 'Concept: address translation',
        summary: 'One address, two halves, one lookup.',
        estimatedMinutes: 8,
        intro:
          'Paging breaks the address space into fixed pages and physical memory into matching frames, so any page can live in any frame. Translation rewrites the page number and leaves the offset alone.',
        points: [
          'A logical address splits into a page number (high bits) and an offset (low bits).',
          'The TLB caches recent translations; a miss falls back to the page table.',
          'A page fault means the page is not resident, so the OS loads it into a free frame.',
          'When no frame is free, a replacement policy chooses a victim.',
        ],
      },
      {
        kind: 'visualization',
        title: 'Visualization: translate an address',
        summary: 'See each address split and recombined.',
        estimatedMinutes: 6,
        labId: 'lab-tlb-translation',
        note: 'Open Paging, Address Translation & the TLB and step through the reference stream. Each step shows the binary split, the TLB lookup and the physical address.',
        focus: [
          'How the offset is copied through unchanged.',
          'What a TLB miss costs compared with a hit.',
          'What happens when a referenced page is absent.',
        ],
      },
      {
        kind: 'experiment',
        title: 'Experiment: race the replacement policies',
        summary: 'Same string, four policies, different fault counts.',
        estimatedMinutes: 10,
        labId: 'lab-page-replacement',
        setup:
          'In Page Replacement, replay 7 0 1 2 0 3 0 4 2 3 0 3 over three frames under FIFO, then LRU, OPT and Clock.',
        observations: [
          'OPT faults the least — it is the theoretical lower bound.',
          'Each fault names the victim and the reason it was chosen.',
          'Switching to the anomalous string makes FIFO fault more with four frames.',
        ],
      },
      {
        kind: 'walkthrough',
        title: 'Walkthrough: follow one address',
        summary: 'Address 100, step by step.',
        estimatedMinutes: 8,
        steps: [
          { title: 'Split the address', detail: 'With 64-byte pages, 100 = page ⌊100/64⌋ = 1, offset 100 − 64 = 36.' },
          { title: 'Look in the TLB', detail: 'If page 1 is cached, take the frame immediately; otherwise walk the page table.' },
          { title: 'Walk the page table', detail: 'The entry for page 1 gives the frame number, and the valid bit says whether it is resident.' },
          { title: 'Handle a fault', detail: 'If valid is 0, the OS loads the page into a free frame (or evicts one) and retries.' },
          { title: 'Recombine', detail: 'Physical = frame × 64 + 36. The offset never changed.' },
        ],
      },
      {
        kind: 'challenge',
        title: 'Challenge: translate and replace',
        summary: 'Graded questions on geometry, TLB and faults.',
        estimatedMinutes: 4,
        bankIds: ['address-translation', 'tlb', 'page-faults', 'page-replacement'],
        note: 'Work through the paging and replacement banks. Geometry answers come from the address maths; TLB and fault answers are read from the engine run.',
      },
      {
        kind: 'reflection',
        title: 'Reflection',
        summary: 'Connect to real hardware.',
        estimatedMinutes: 3,
        prompts: [
          'Why does a TLB hit rate matter so much for overall performance?',
          'Why can OPT never be implemented in a real system?',
          'Explain Bélády’s anomaly to a classmate using the frame contents, not just the counts.',
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------- */
  /* 7. Disk scheduling                                                   */
  /* ------------------------------------------------------------------- */
  {
    topicId: 'disk-scheduling',
    title: 'Reducing mechanical seek time',
    subtitle: 'Turning a request queue into head movement.',
    difficulty: 'intermediate',
    estimatedMinutes: 30,
    prerequisites: [],
    objectives: [
      'Compute total head movement for a request queue.',
      'Compare FCFS, SSTF, SCAN, C-SCAN, LOOK and C-LOOK.',
      'Explain SSTF’s starvation risk and how sweeps bound waiting.',
      'Relate the scheduling choice to the workload.',
    ],
    keyTerms: [
      { term: 'Seek time', definition: 'The time the head spends moving between cylinders — usually the dominant cost.' },
      { term: 'Total head movement', definition: 'The sum of the absolute distances between consecutive services.' },
      { term: 'SSTF', definition: 'Shortest Seek Time First: always serve the nearest pending request.' },
      { term: 'SCAN', definition: 'The elevator: sweep to the disk edge, then reverse.' },
      { term: 'C-SCAN', definition: 'Sweep one way only and jump back to the start without servicing.' },
      { term: 'LOOK', definition: 'Like SCAN, but reverse at the last request rather than the disk edge.' },
    ],
    commonMistakes: [
      { mistake: 'Counting the number of services instead of the distance moved.', correction: 'Cost is total head movement, so the gaps between cylinders are what you sum.' },
      { mistake: 'Assuming the minimum-distance policy is always best.', correction: 'SSTF minimises distance but can starve a far request indefinitely.' },
      { mistake: 'Confusing SCAN with LOOK.', correction: 'SCAN goes all the way to the edge; LOOK turns around at the last pending request.' },
    ],
    stages: [
      {
        kind: 'concept',
        title: 'Concept: the elevator problem',
        summary: 'Order matters, but only because the head is mechanical.',
        estimatedMinutes: 6,
        intro:
          'A hard disk must physically move its head to each cylinder, and that movement dominates the cost of a request. Scheduling is simply choosing an order that reduces the total travel without starving anyone.',
        points: [
          'FCFS follows arrival order and pays for the zig-zag.',
          'SSTF minimises each hop but has no fairness guarantee.',
          'Sweep policies (SCAN, C-SCAN, LOOK, C-LOOK) bound every request’s wait to one pass.',
          'The initial sweep direction changes the service order for every sweep policy.',
        ],
      },
      {
        kind: 'visualization',
        title: 'Visualization: draw the head path',
        summary: 'See the movement before summing it.',
        estimatedMinutes: 5,
        labId: 'lab-disk-scheduling',
        note: 'Open Disk Head Scheduling and press play. The track and seek chart trace the head as it moves, one service at a time.',
        focus: [
          'Where the head reverses, and why.',
          'How FCFS bounces across the whole disk.',
          'The band that shows the distance travelled by the latest seek.',
        ],
      },
      {
        kind: 'experiment',
        title: 'Experiment: six policies, one queue',
        summary: 'Compare total movement side by side.',
        estimatedMinutes: 8,
        labId: 'lab-disk-scheduling',
        setup:
          'Load the classic queue 98, 183, 37, 122, 14, 124, 65, 67 across cylinders 0–199 from head 53 sweeping up.',
        observations: [
          'FCFS travels the furthest; SSTF the least.',
          'SCAN overshoots to 199 while LOOK reverses at 183.',
          'The far request at cylinder 14 is still served by every sweep policy in one pass.',
        ],
      },
      {
        kind: 'walkthrough',
        title: 'Walkthrough: total movement by hand',
        summary: 'Sum the jumps for SSTF.',
        estimatedMinutes: 6,
        steps: [
          { title: 'Start at 53', detail: 'Find the nearest pending request: 65, a distance of 12.' },
          { title: 'Keep taking the nearest', detail: 'From 65 the nearest is 67 (2); once there it is 37 (30), not 98 (31) — distance beats direction.' },
          { title: 'Continue', detail: 'The order becomes 65, 67, 37, 14, 98, 122, 124, 183.' },
          { title: 'Sum the distances', detail: 'Add 12 + 2 + 30 + 23 + 84 + 24 + 2 + 59 to get 236 cylinders.' },
          { title: 'Compare', detail: 'FCFS on the same queue moves 640 cylinders — SSTF saves over 400 but ignores fairness.' },
        ],
      },
      {
        kind: 'challenge',
        title: 'Challenge: movement and fairness',
        summary: 'Graded questions on distances and policies.',
        estimatedMinutes: 3,
        bankIds: ['disk-scheduling'],
        note: 'Try the Disk Scheduling bank. Total movement, average seek and service order are all read from the disk engine.',
      },
      {
        kind: 'reflection',
        title: 'Reflection',
        summary: 'Choose a policy for a scenario.',
        estimatedMinutes: 2,
        prompts: [
          'When would the extra edge travel of SCAN over LOOK actually help?',
          'What property do all sweep policies share that SSTF lacks?',
          'Modern SSDs have no moving head — does request reordering still matter, and why?',
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------- */
  /* 8. File systems                                                      */
  /* ------------------------------------------------------------------- */
  {
    topicId: 'file-systems',
    title: 'Naming, storing and finding bytes',
    subtitle: 'Directories, inodes and allocation strategies.',
    difficulty: 'advanced',
    estimatedMinutes: 40,
    prerequisites: ['memory-management', 'disk-scheduling'],
    objectives: [
      'Compare contiguous, linked and indexed allocation.',
      'Trace a path from a directory entry to an inode to data blocks.',
      'Explain what an inode records and why the name is not one of those fields.',
      'Explain how the free-space bitmap and external fragmentation affect a file.',
    ],
    keyTerms: [
      { term: 'Inode', definition: 'The metadata record for one file: size, permissions, timestamps and block pointers.' },
      { term: 'Directory entry', definition: 'A name mapped to an inode number; the name lives here, not in the inode.' },
      { term: 'Contiguous allocation', definition: 'A file occupies one unbroken run of blocks.' },
      { term: 'Linked allocation', definition: 'Each block holds a pointer to the next, so adjacency is irrelevant.' },
      { term: 'Indexed allocation', definition: 'The inode holds block pointers, with an index block for large files.' },
      { term: 'Free-space bitmap', definition: 'One bit per block, saying whether it is in use.' },
    ],
    commonMistakes: [
      { mistake: 'Thinking a rename rewrites the file.', correction: 'Only the directory entry changes; the inode and data blocks are untouched.' },
      { mistake: 'Assuming a contiguous file can always grow in place.', correction: 'It can extend only into the block directly after it, which may belong to another file.' },
      { mistake: 'Believing a disk is full only when no blocks are free.', correction: 'A volume can run out of inodes while hundreds of blocks remain free.' },
    ],
    stages: [
      {
        kind: 'concept',
        title: 'Concept: names, inodes, blocks',
        summary: 'Three layers that must agree.',
        estimatedMinutes: 7,
        intro:
          'A filename is not the file. The directory maps a name to an inode number, the inode holds the metadata and pointers, and the blocks hold the data. Keeping these layers separate is what makes rename instant and links possible.',
        points: [
          'Directories are files too: a name → inode-number table with a parent link.',
          'Contiguous allocation is fast to read but fragments externally and resists growth.',
          'Linked and indexed allocation need no adjacency, so they survive a fragmented disk.',
          'A large indexed file needs an extra block just to hold pointers.',
        ],
      },
      {
        kind: 'visualization',
        title: 'Visualization: from path to blocks',
        summary: 'Watch the tree, the inodes and the bitmap move together.',
        estimatedMinutes: 6,
        labId: 'lab-file-allocation',
        note: 'Open File Allocation, Inodes & Free Space and step through a script. The directory tree, inode table and block map all update on the same step, so you can follow one file end to end.',
        focus: [
          'Which blocks a newly created file receives.',
          'How the bitmap flips when a file is deleted.',
          'Where the block pointers live in the inode for each strategy.',
        ],
      },
      {
        kind: 'experiment',
        title: 'Experiment: fragment the disk, then grow',
        summary: 'Make contiguous allocation fail where linked succeeds.',
        estimatedMinutes: 9,
        labId: 'lab-file-allocation',
        setup:
          'Fill an eight-block disk, free two isolated blocks, then create a two-block file. Switch the strategy between contiguous and linked.',
        observations: [
          'Contiguous allocation refuses the file — the two free blocks are not adjacent.',
          'Linked allocation accepts it and chains the two holes together.',
          'The fragmentation metrics show two free runs with a largest run of one block.',
        ],
      },
      {
        kind: 'walkthrough',
        title: 'Walkthrough: create, grow, delete',
        summary: 'Follow one file through its whole life.',
        estimatedMinutes: 8,
        steps: [
          { title: 'Create', detail: 'A name is added to the directory, an inode is taken from the free list, and blocks are marked used in the bitmap.' },
          { title: 'Grow', detail: 'The file asks for another block: contiguous needs the block right after it, linked takes any free block and repoints the tail.' },
          { title: 'Read', detail: 'The path resolves to an inode; the inode’s pointers give the blocks; linked files must follow the chain.' },
          { title: 'Shrink', detail: 'Trailing blocks are returned to the bitmap, and the index block is released once the file is small enough.' },
          { title: 'Delete', detail: 'The directory entry goes, and the inode returns to the free list — its blocks become reusable.' },
        ],
      },
      {
        kind: 'challenge',
        title: 'Challenge: allocation and inodes',
        summary: 'Graded questions on blocks, inodes and pointers.',
        estimatedMinutes: 4,
        bankIds: ['allocation', 'inodes', 'space', 'behaviour', 'pointers'],
        note: 'Work through the file-system banks. Block counts, inode numbers and pointer targets are all read from the file-system engine.',
      },
      {
        kind: 'reflection',
        title: 'Reflection',
        summary: 'Relate to the file systems you use.',
        estimatedMinutes: 3,
        prompts: [
          'Why is renaming a multi-gigabyte file instant while copying it is slow?',
          'What would a workload of many tiny files do to an inode table?',
          'Which allocation strategy would you pick for random access, and which for streaming writes?',
        ],
      },
    ],
  },
];

/** Lesson lookup by learning-area id. */
export const LESSONS_BY_TOPIC: ReadonlyMap<string, GuidedLesson> = new Map(
  LESSONS.map((lesson) => [lesson.topicId, lesson]),
);
