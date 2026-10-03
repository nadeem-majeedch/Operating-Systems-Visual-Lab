import type { EducationalExample, Lab } from '@/types';
import { EXAMPLES_BY_LAB } from './examples';

function examplesFor(labId: string): readonly EducationalExample<unknown>[] {
  return EXAMPLES_BY_LAB[labId] ?? [];
}

/**
 * Every interactive activity in the lab, grouped by topic through `topicId`.
 *
 * `status` drives the UI: `available` labs render a full simulator, `beta` labs
 * render a work-in-progress banner, and `planned` labs render the learning
 * objectives and worked examples so the curriculum is still browsable.
 */
export const LABS: readonly Lab[] = [
  /* ------------------------------------------------ CPU scheduling -------- */
  {
    id: 'lab-fcfs',
    topicId: 'cpu-scheduling',
    title: 'First Come, First Served',
    summary: 'Animate a non-preemptive schedule and measure waiting time.',
    description:
      'Add processes, press play, and watch the Gantt chart fill in one dispatch at a time. Every step reports how the running totals for turnaround and waiting time were derived.',
    difficulty: 'beginner',
    status: 'available',
    estimatedMinutes: 15,
    algorithmIds: ['fcfs'],
    objectives: [
      'Build a Gantt chart from an arrival table.',
      'Compute turnaround and waiting time for every process.',
      'Explain the convoy effect and when FCFS is a reasonable choice.',
    ],
    examples: examplesFor('lab-fcfs'),
  },
  {
    id: 'lab-sjf',
    topicId: 'cpu-scheduling',
    title: 'Shortest Job First',
    summary: 'Compare non-preemptive shortest-first against FCFS.',
    description:
      'The same arrival table produces a different schedule once the shortest job jumps the queue. Watch average waiting time fall and starvation risk grow.',
    difficulty: 'intermediate',
    status: 'available',
    estimatedMinutes: 20,
    algorithmIds: ['sjf', 'srtf'],
    objectives: [
      'Prove that shortest-first minimises average waiting time for simultaneous arrivals.',
      'Identify the arrival patterns where SJF rejects optimality.',
      'Describe how real schedulers estimate burst time.',
    ],
    examples: examplesFor('lab-sjf'),
  },
  {
    id: 'lab-round-robin',
    topicId: 'cpu-scheduling',
    title: 'Round Robin & Time Quantum',
    summary: 'Tune the quantum and watch responsiveness trade off against overhead.',
    description:
      'Step through the ready queue slice by slice. Each process consumes at most one quantum before returning to the tail, and the measurement panel shows what that costs in context switches.',
    difficulty: 'intermediate',
    status: 'available',
    estimatedMinutes: 20,
    algorithmIds: ['round-robin'],
    objectives: [
      'Trace a round-robin schedule with a given quantum.',
      'Relate quantum size to response time and context-switch cost.',
      'Recognise when Round Robin degenerates to FCFS.',
    ],
    examples: examplesFor('lab-round-robin'),
  },
  {
    id: 'lab-priority-scheduling',
    topicId: 'cpu-scheduling',
    title: 'Priority Scheduling',
    summary: 'Let urgency, not arrival order, decide who runs next.',
    description:
      'Assign priorities and watch the highest-priority ready process win the CPU — non-preemptively, then preemptively. A steady stream of urgent arrivals shows exactly why real kernels add aging.',
    difficulty: 'intermediate',
    status: 'available',
    estimatedMinutes: 20,
    algorithmIds: ['priority-scheduling', 'priority-preemptive'],
    objectives: [
      'Apply priority scheduling with lower numbers meaning higher priority.',
      'Contrast the preemptive and non-preemptive variants on one workload.',
      'Explain starvation and how aging remedies it.',
    ],
    examples: examplesFor('lab-priority-scheduling'),
  },

  /* -------------------------------------------------- Process mgmt ------- */
  {
    id: 'lab-process-lifecycle',
    topicId: 'process-management',
    title: 'Process Lifecycle',
    summary: 'Drive a process through every state transition.',
    description:
      'Create processes, drive them through the five states and trigger context switches, inspecting the PCB fields the kernel must update on each transition.',
    difficulty: 'beginner',
    status: 'available',
    estimatedMinutes: 15,
    algorithmIds: ['process-state-machine'],
    objectives: [
      'Name all five process states and the legal transitions between them.',
      'Explain which transitions are caused by the scheduler and which by the process.',
      'Relate PCB contents to each transition.',
    ],
    examples: examplesFor('lab-process-lifecycle'),
  },
  {
    id: 'lab-fork-exec',
    topicId: 'process-management',
    title: 'fork, exec and Process Trees',
    summary: 'Grow a process tree and see what each child inherits.',
    description:
      'Visualise copy-on-write address spaces, file-descriptor inheritance and PID assignment as a program forks and execs.',
    difficulty: 'intermediate',
    status: 'planned',
    estimatedMinutes: 20,
    algorithmIds: ['fork-exec'],
    objectives: [
      'Predict how many processes a chain of forks creates.',
      'Describe what fork copies and what exec replaces.',
      'Troubleshoot zombie and orphan processes.',
    ],
    examples: examplesFor('lab-fork-exec'),
  },

  /* ------------------------------------------------- Synchronization ----- */
  {
    id: 'lab-mutex',
    topicId: 'synchronization',
    title: 'Critical Sections & Mutual Exclusion',
    summary: 'Race two processes on a shared counter, then fix it with a lock.',
    description:
      'Step through the load–add–store sequence instruction by instruction. With no protection the interleaving loses updates; a mutex or a binary semaphore restores correctness and shows what blocking costs.',
    difficulty: 'beginner',
    status: 'available',
    estimatedMinutes: 20,
    algorithmIds: ['mutex'],
    objectives: [
      'Explain why a non-atomic increment can lose updates.',
      'State the three requirements of a correct critical-section solution.',
      'Distinguish mutual exclusion from ordering constraints.',
    ],
    examples: examplesFor('lab-mutex'),
  },
  {
    id: 'lab-bounded-buffer',
    topicId: 'synchronization',
    title: 'Bounded Buffer',
    summary: 'Drive producers and consumers through empty, full and mutex.',
    description:
      'The canonical producer/consumer problem. Watch empty and full semaphores throttle the actors so the buffer never overflows or underflows, while mutex serialises access to the buffer itself.',
    difficulty: 'intermediate',
    status: 'available',
    estimatedMinutes: 25,
    algorithmIds: ['bounded-buffer', 'semaphore'],
    objectives: [
      'Use counting semaphores to express capacity constraints.',
      'Explain why the order of wait() calls matters.',
      'Distinguish deadlock from busy-waiting.',
    ],
    examples: examplesFor('lab-bounded-buffer'),
  },
  {
    id: 'lab-dining-philosophers',
    topicId: 'synchronization',
    title: 'Dining Philosophers',
    summary: 'Deadlock a table of philosophers, then break the circular wait.',
    description:
      'Five philosophers, five forks and a rule that eating needs both. The naive acquisition order deadlocks; ordering the last philosopher’s picks or limiting the table to n − 1 seats restores progress.',
    difficulty: 'intermediate',
    status: 'available',
    estimatedMinutes: 20,
    algorithmIds: ['dining-philosophers'],
    objectives: [
      'Name the four Coffman conditions and find them in the table.',
      'Explain how resource ordering removes the circular wait.',
      'Compare the ordered and waiter solutions.',
    ],
    examples: examplesFor('lab-dining-philosophers'),
  },
  {
    id: 'lab-readers-writers',
    topicId: 'synchronization',
    title: 'Readers & Writers',
    summary: 'Let readers share the data while writers take it exclusively.',
    description:
      'Readers-preference readers/writers: the first reader in locks out writers, the last one out releases them. See readers overlap and watch a writer wait behind a stream of readers.',
    difficulty: 'intermediate',
    status: 'available',
    estimatedMinutes: 20,
    algorithmIds: ['readers-writers'],
    objectives: [
      'Explain why readers may run concurrently but writers may not.',
      'Trace readCount as a resource guarded by its own mutex.',
      'Describe why readers preference can starve writers.',
    ],
    examples: examplesFor('lab-readers-writers'),
  },

  /* ------------------------------------------------------ Deadlocks ------ */
  {
    id: 'lab-bankers',
    topicId: 'deadlocks',
    title: "Banker's Algorithm",
    summary: 'Decide whether a resource request keeps the system safe.',
    description:
      'Edit the allocation, maximum and available matrices, then request resources and follow the safety algorithm step by step.',
    difficulty: 'advanced',
    status: 'available',
    estimatedMinutes: 30,
    algorithmIds: ['bankers-algorithm'],
    objectives: [
      'Compute a safe sequence for a given state.',
      'Explain the difference between prevention, avoidance and detection.',
      'Recognise the cost of conservative allocation.',
    ],
    examples: examplesFor('lab-bankers'),
  },
  {
    id: 'lab-wait-for-graph',
    topicId: 'deadlocks',
    title: 'Resource & Wait-for Graphs',
    summary: 'Detect deadlock by finding a cycle.',
    description:
      'Build a resource-allocation graph, collapse it into a wait-for graph, and apply the reduction algorithm for multiple instances.',
    difficulty: 'intermediate',
    status: 'available',
    estimatedMinutes: 20,
    algorithmIds: ['wait-for-graph'],
    objectives: [
      'Draw a resource-allocation graph from a scenario.',
      'Detect cycles and decide whether deadlock is proven or merely possible.',
      'Compare detection with prevention.',
    ],
    examples: examplesFor('lab-wait-for-graph'),
  },

  /* ----------------------------------------------- Memory management ----- */
  {
    id: 'lab-contiguous-allocation',
    topicId: 'memory-management',
    title: 'Contiguous Allocation & Fragmentation',
    summary: 'Allocate, free and compact memory with four placement strategies.',
    description:
      'Run requests against a variable-partition memory map using first, best, worst and next fit, watch external fragmentation build up, and compact it away.',
    difficulty: 'intermediate',
    status: 'available',
    estimatedMinutes: 25,
    algorithmIds: ['first-fit', 'best-fit', 'worst-fit', 'next-fit'],
    objectives: [
      'Apply first-fit, best-fit, worst-fit and next-fit placement.',
      'Distinguish internal from external fragmentation.',
      'Explain what compaction costs and when it is worth it.',
    ],
    examples: examplesFor('lab-contiguous-allocation'),
  },
  {
    id: 'lab-fixed-partitions',
    topicId: 'memory-management',
    title: 'Fixed Partitions & Internal Fragmentation',
    summary: 'Pre-divide memory and measure the waste trapped inside partitions.',
    description:
      'Memory is split into fixed partitions before any process arrives. A process occupies a whole partition even when it is smaller, so the unused tail is internal fragmentation — visible on every block and totalled in the metrics.',
    difficulty: 'beginner',
    status: 'available',
    estimatedMinutes: 20,
    algorithmIds: ['fixed-partitions'],
    objectives: [
      'Place processes into fixed partitions and read the internal waste.',
      'Explain why fixed partitions never suffer external fragmentation.',
      'Compare partition-slot waste against variable-partition holes.',
    ],
    examples: examplesFor('lab-fixed-partitions'),
  },
  {
    id: 'lab-buddy-system',
    topicId: 'memory-management',
    title: 'Buddy Allocator',
    summary: 'Split and coalesce power-of-two blocks.',
    description:
      'Allocate and release kernel-sized blocks and watch buddies merge back together, measuring the internal fragmentation that buys this speed.',
    difficulty: 'intermediate',
    status: 'planned',
    estimatedMinutes: 20,
    algorithmIds: ['buddy-system'],
    objectives: [
      'Split a block until a request fits and round up to the next power of two.',
      'Coalesce only genuine buddies.',
      'Quantify internal fragmentation for a workload.',
    ],
    examples: examplesFor('lab-buddy-system'),
  },

  /* --------------------------------------------------- Virtual memory ---- */
  {
    id: 'lab-page-replacement',
    topicId: 'virtual-memory',
    title: 'Page Replacement',
    summary: 'Race FIFO, LRU, OPT and Clock over a reference string.',
    description:
      'Replay a reference string across a configurable number of frames, see every hit, fault and eviction explained, compare the policies side by side, and trigger Bélády’s anomaly under FIFO.',
    difficulty: 'intermediate',
    status: 'available',
    estimatedMinutes: 35,
    algorithmIds: ['fifo-page', 'optimal-page', 'lru-page', 'clock-page'],
    objectives: [
      'Simulate FIFO, LRU, OPT and Second Chance (Clock) by hand.',
      'Read the exact reason for every eviction.',
      'Explain why OPT is only a theoretical bound.',
      'Identify Bélády’s anomaly in a FIFO run.',
    ],
    examples: examplesFor('lab-page-replacement'),
  },
  {
    id: 'lab-tlb-translation',
    topicId: 'virtual-memory',
    title: 'Paging, Address Translation & the TLB',
    summary: 'Split a logical address and translate it through the TLB and page table.',
    description:
      'Configure the page size, address widths and TLB, then translate a stream of logical addresses. Watch each address split into page number and offset, hit or miss in the TLB, walk the page table, fault an absent page in, and recombine into a physical address.',
    difficulty: 'advanced',
    status: 'available',
    estimatedMinutes: 30,
    algorithmIds: ['address-translation'],
    objectives: [
      'Split a logical address into page number and offset.',
      'Translate a page number to a frame through the page table.',
      'Distinguish a TLB hit, a TLB miss and a page fault.',
    ],
    examples: examplesFor('lab-tlb-translation'),
  },

  /* ------------------------------------------------- Disk scheduling ----- */
  {
    id: 'lab-disk-scheduling',
    topicId: 'disk-scheduling',
    title: 'Disk Head Scheduling',
    summary: 'Sweep a request queue with FCFS, SSTF, SCAN, C-SCAN, LOOK and C-LOOK.',
    description:
      'Move the disk head across a configurable cylinder range, animate every seek, and compare total head movement, average seek distance and service order across six policies.',
    difficulty: 'intermediate',
    status: 'available',
    estimatedMinutes: 35,
    algorithmIds: ['fcfs-disk', 'sstf', 'scan', 'c-scan', 'look', 'c-look'],
    objectives: [
      'Compute total seek distance and average seek distance for a request queue.',
      'Explain the starvation risk of SSTF.',
      'Distinguish SCAN from LOOK and C-SCAN from C-LOOK.',
      'Choose a policy for a given workload mix.',
    ],
    examples: examplesFor('lab-disk-scheduling'),
  },

  /* ---------------------------------------------------- File systems ----- */
  {
    id: 'lab-file-allocation',
    topicId: 'file-systems',
    title: 'File Allocation, Inodes & Free Space',
    summary: 'Build a virtual file system and watch blocks, inodes and the bitmap change.',
    description:
      'Create a directory tree and store files across a fixed block device under contiguous, linked and indexed allocation. Perform mkdir, create, delete, rename, move, open, close and chmod, step through every operation, inspect inode metadata and block pointers, and read the free-space bitmap after each change.',
    difficulty: 'intermediate',
    status: 'available',
    estimatedMinutes: 35,
    algorithmIds: ['contiguous-allocation', 'linked-allocation', 'indexed-allocation'],
    objectives: [
      'Compare contiguous, linked and indexed block allocation.',
      'Trace a path from a directory entry to its data blocks.',
      'Read an inode’s size, permissions, timestamps and block pointers.',
      'Explain how the free-space bitmap tracks used blocks.',
    ],
    examples: examplesFor('lab-file-allocation'),
  },
];

export const LABS_BY_ID: ReadonlyMap<string, Lab> = new Map(LABS.map((lab) => [lab.id, lab]));
