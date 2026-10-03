import type { Lab, Topic, TopicId } from '@/types';
import { LABS } from './labs';

function labsFor(topicId: TopicId): readonly Lab[] {
  return LABS.filter((lab) => lab.topicId === topicId);
}

/**
 * The eight major learning areas, in recommended teaching order.
 *
 * Each topic owns its labs; the UI never hard-codes a topic list, so adding a
 * ninth area is a content change rather than a code change.
 */
export const TOPICS: readonly Topic[] = [
  {
    id: 'process-management',
    title: 'Process Management',
    tagline: 'Processes, threads and the PCB.',
    description:
      'Follow a process from creation to termination. Inspect the PCB, trace forks and execs, and see exactly what the kernel must remember to make each transition reversible.',
    glyph: '🧩',
    accent: '#22d3ee',
    difficulty: 'beginner',
    estimatedMinutes: 35,
    prerequisites: [],
    objectives: [
      'Name the process states and legal transitions.',
      'Describe the contents of a process control block.',
      'Explain fork, exec and copy-on-write.',
    ],
    labs: labsFor('process-management'),
  },
  {
    id: 'cpu-scheduling',
    title: 'CPU Scheduling',
    tagline: 'Who gets the processor next?',
    description:
      'Scheduling policy decides how fairly and how efficiently a single CPU is shared. Build Gantt charts by hand, then measure turnaround, waiting and response time for real arrival patterns.',
    glyph: '⏱️',
    accent: '#6366f1',
    difficulty: 'beginner',
    estimatedMinutes: 55,
    prerequisites: ['process-management'],
    objectives: [
      'Distinguish preemptive from non-preemptive policies.',
      'Compute turnaround, waiting and response time.',
      'Explain starvation, fairness and the convoy effect.',
    ],
    labs: labsFor('cpu-scheduling'),
  },
  {
    id: 'synchronization',
    title: 'Process Synchronization',
    tagline: 'Making concurrent code correct.',
    description:
      'Race conditions are invisible until they are not. Interleave threads by hand, watch a lost update appear, then repair it with mutexes and semaphores.',
    glyph: '🔒',
    accent: '#f59e0b',
    difficulty: 'intermediate',
    estimatedMinutes: 45,
    prerequisites: ['process-management'],
    objectives: [
      'Explain why non-atomic updates lose data.',
      'State the three requirements of a critical section.',
      'Solve producer/consumer with semaphores.',
    ],
    labs: labsFor('synchronization'),
  },
  {
    id: 'deadlocks',
    title: 'Deadlocks',
    tagline: 'When progress stops for good.',
    description:
      'Four conditions, one deadlock. Detect it in a wait-for graph, avoid it with safety checks, and reason about the trade-off between prevention and throughput.',
    glyph: '🔗',
    accent: '#fb7185',
    difficulty: 'advanced',
    estimatedMinutes: 45,
    prerequisites: ['synchronization'],
    objectives: [
      'List the four Coffman conditions.',
      'Detect deadlock with a wait-for graph.',
      'Apply the safety algorithm from the banker’s algorithm.',
    ],
    labs: labsFor('deadlocks'),
  },
  {
    id: 'memory-management',
    title: 'Memory Management',
    tagline: 'Placing processes in physical memory.',
    description:
      'Fit processes into a finite address space. Compare placement strategies, watch fragmentation accumulate, and see why kernels allocate in power-of-two blocks.',
    glyph: '🧠',
    accent: '#34d399',
    difficulty: 'intermediate',
    estimatedMinutes: 45,
    prerequisites: ['process-management'],
    objectives: [
      'Apply first-fit, best-fit and worst-fit placement.',
      'Explain internal versus external fragmentation.',
      'Describe paging and segmentation trade-offs.',
    ],
    labs: labsFor('memory-management'),
  },
  {
    id: 'virtual-memory',
    title: 'Virtual Memory',
    tagline: 'Pretending memory is bigger than it is.',
    description:
      'Translate virtual addresses, fill the TLB, and choose a victim when frames run out. Compare real replacement policies against the theoretical optimum.',
    glyph: '📄',
    accent: '#a78bfa',
    difficulty: 'advanced',
    estimatedMinutes: 55,
    prerequisites: ['memory-management'],
    objectives: [
      'Walk a multi-level page table.',
      'Simulate FIFO, LRU and OPT page replacement.',
      'Compute effective access time from a hit rate.',
    ],
    labs: labsFor('virtual-memory'),
  },
  {
    id: 'disk-scheduling',
    title: 'Disk Scheduling',
    tagline: 'Reducing mechanical seek time.',
    description:
      'A spinning disk turns request order into physical head movement. Sweep a queue with four classic policies and measure seek distance against fairness.',
    glyph: '💽',
    accent: '#38bdf8',
    difficulty: 'intermediate',
    estimatedMinutes: 35,
    prerequisites: [],
    objectives: [
      'Compute total head movement for a request queue.',
      'Compare FCFS, SSTF, SCAN and C-SCAN.',
      'Relate scheduling choice to workload characteristics.',
    ],
    labs: labsFor('disk-scheduling'),
  },
  {
    id: 'file-systems',
    title: 'File Systems',
    tagline: 'Naming, storing and finding bytes.',
    description:
      'Follow a filename down to physical blocks. Compare allocation strategies, extend a file, and see what an inode really records.',
    glyph: '📁',
    accent: '#c084fc',
    difficulty: 'advanced',
    estimatedMinutes: 40,
    prerequisites: ['memory-management', 'disk-scheduling'],
    objectives: [
      'Compare contiguous, linked and indexed allocation.',
      'Trace a file path to its data blocks.',
      'Explain inode fields and directory semantics.',
    ],
    labs: labsFor('file-systems'),
  },
];

export const TOPICS_BY_ID: ReadonlyMap<TopicId, Topic> = new Map(
  TOPICS.map((topic) => [topic.id, topic]),
);
