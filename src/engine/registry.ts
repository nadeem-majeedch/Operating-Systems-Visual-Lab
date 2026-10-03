import type { Id } from '@/types';
import type { EngineDescriptor } from './types';
import {
  BANKERS_ALGORITHM_ID,
  BANKERS_ENGINE_ID,
  BANKERS_LAB_ID,
  RAG_ALGORITHM_ID,
  RAG_ENGINE_ID,
  RAG_LAB_ID,
} from './deadlock';
import { DISK_ALGORITHM_IDS, DISK_ENGINE_ID, DISK_LAB_ID } from './disk';
import { ALLOCATION_ALGORITHM_IDS, FS_ENGINE_ID, FS_LAB_ID } from './fs';
import { CONTIGUOUS_LAB_ID, FIXED_PARTITIONS_LAB_ID } from './memory';
import { PAGING_ALGORITHM_ID, PAGING_ENGINE_ID, PAGING_LAB_ID } from './paging';
import {
  PAGE_REPLACEMENT_ENGINE_ID,
  PAGE_REPLACEMENT_LAB_ID,
  REPLACEMENT_ALGORITHM_IDS,
} from './replacement';
import {
  PROCESS_ALGORITHM_ID,
  PROCESS_ENGINE_ID,
  PROCESS_LAB_ID,
} from './process';
import {
  PHILOSOPHERS_ALGORITHM_ID,
  PHILOSOPHERS_ENGINE_ID,
  PHILOSOPHERS_LAB_ID,
  PRODUCER_CONSUMER_ALGORITHM_ID,
  PRODUCER_CONSUMER_ENGINE_ID,
  PRODUCER_CONSUMER_LAB_ID,
  RACE_ALGORITHM_ID,
  RACE_ENGINE_ID,
  RACE_LAB_ID,
  READERS_WRITERS_ALGORITHM_ID,
  READERS_WRITERS_ENGINE_ID,
  READERS_WRITERS_LAB_ID,
} from './synchronization';
import {
  FCFS_ALGORITHM_ID,
  FCFS_ENGINE_ID,
  FCFS_LAB_ID,
  PRIORITY_ALGORITHM_ID,
  PRIORITY_ENGINE_ID,
  PRIORITY_LAB_ID,
  PRIORITY_PREEMPTIVE_ALGORITHM_ID,
  PRIORITY_PREEMPTIVE_ENGINE_ID,
  ROUND_ROBIN_ALGORITHM_ID,
  ROUND_ROBIN_ENGINE_ID,
  ROUND_ROBIN_LAB_ID,
  SJF_ALGORITHM_ID,
  SJF_ENGINE_ID,
  SJF_LAB_ID,
  SRTF_ALGORITHM_ID,
  SRTF_ENGINE_ID,
} from './scheduling';

/**
 * Discovery layer for simulation engines.
 *
 * The registry intentionally stores *descriptors*, not run functions, so the UI
 * can render "available / planned" badges without importing every engine, while
 * feature modules import the concrete engine they render. That keeps the
 * registry type-safe with no `any` and no circular imports.
 */
const DESCRIPTORS: readonly EngineDescriptor[] = [
  {
    engineId: PROCESS_ENGINE_ID,
    algorithmId: PROCESS_ALGORITHM_ID,
    labId: PROCESS_LAB_ID,
    name: 'Process State Machine',
    description:
      'Drives a process through new, ready, running, waiting and terminated while recording PCB bookkeeping.',
    implemented: true,
  },
  {
    engineId: FCFS_ENGINE_ID,
    algorithmId: FCFS_ALGORITHM_ID,
    labId: FCFS_LAB_ID,
    name: 'First Come, First Served (FCFS)',
    description: 'Non-preemptive scheduling in strict arrival order.',
    implemented: true,
  },
  {
    engineId: SJF_ENGINE_ID,
    algorithmId: SJF_ALGORITHM_ID,
    labId: SJF_LAB_ID,
    name: 'Shortest Job First (SJF)',
    description: 'Non-preemptive shortest-first scheduling.',
    implemented: true,
  },
  {
    engineId: SRTF_ENGINE_ID,
    algorithmId: SRTF_ALGORITHM_ID,
    labId: SJF_LAB_ID,
    name: 'Shortest Remaining Time First (SRTF)',
    description: 'Preemptive shortest-first scheduling.',
    implemented: true,
  },
  {
    engineId: ROUND_ROBIN_ENGINE_ID,
    algorithmId: ROUND_ROBIN_ALGORITHM_ID,
    labId: ROUND_ROBIN_LAB_ID,
    name: 'Round Robin (RR)',
    description: 'Preemptive time-slicing with a configurable quantum.',
    implemented: true,
  },
  {
    engineId: PRIORITY_ENGINE_ID,
    algorithmId: PRIORITY_ALGORITHM_ID,
    labId: PRIORITY_LAB_ID,
    name: 'Priority Scheduling',
    description: 'Non-preemptive priority scheduling; the highest priority ready process runs.',
    implemented: true,
  },
  {
    engineId: PRIORITY_PREEMPTIVE_ENGINE_ID,
    algorithmId: PRIORITY_PREEMPTIVE_ALGORITHM_ID,
    labId: PRIORITY_LAB_ID,
    name: 'Preemptive Priority Scheduling',
    description: 'Preemptive priority scheduling; a higher-priority arrival takes the CPU.',
    implemented: true,
  },
  {
    engineId: RACE_ENGINE_ID,
    algorithmId: RACE_ALGORITHM_ID,
    labId: RACE_LAB_ID,
    name: 'Race Conditions & Mutual Exclusion',
    description: 'Interleaved increments with and without a lock, showing lost updates.',
    implemented: true,
  },
  {
    engineId: PRODUCER_CONSUMER_ENGINE_ID,
    algorithmId: PRODUCER_CONSUMER_ALGORITHM_ID,
    labId: PRODUCER_CONSUMER_LAB_ID,
    name: 'Producer / Consumer',
    description: 'Bounded buffer guarded by empty, full and mutex semaphores.',
    implemented: true,
  },
  {
    engineId: PHILOSOPHERS_ENGINE_ID,
    algorithmId: PHILOSOPHERS_ALGORITHM_ID,
    labId: PHILOSOPHERS_LAB_ID,
    name: 'Dining Philosophers',
    description: 'Deadlock and the ordering fixes that avoid it.',
    implemented: true,
  },
  {
    engineId: READERS_WRITERS_ENGINE_ID,
    algorithmId: READERS_WRITERS_ALGORITHM_ID,
    labId: READERS_WRITERS_LAB_ID,
    name: 'Readers / Writers',
    description: 'Shared readers with exclusive writers.',
    implemented: true,
  },
  {
    engineId: BANKERS_ENGINE_ID,
    algorithmId: BANKERS_ALGORITHM_ID,
    labId: BANKERS_LAB_ID,
    name: 'Banker’s Algorithm',
    description: 'Safety algorithm and resource requests, step by step.',
    implemented: true,
  },
  {
    engineId: RAG_ENGINE_ID,
    algorithmId: RAG_ALGORITHM_ID,
    labId: RAG_LAB_ID,
    name: 'Resource & Wait-for Graphs',
    description: 'Detect deadlock by cycle or by the reduction algorithm.',
    implemented: true,
  },
  {
    engineId: 'first-fit-engine',
    algorithmId: 'first-fit',
    labId: CONTIGUOUS_LAB_ID,
    name: 'First Fit',
    description: 'Place a process in the first hole large enough.',
    implemented: true,
  },
  {
    engineId: 'best-fit-engine',
    algorithmId: 'best-fit',
    labId: CONTIGUOUS_LAB_ID,
    name: 'Best Fit',
    description: 'Place a process in the smallest hole that still fits.',
    implemented: true,
  },
  {
    engineId: 'worst-fit-engine',
    algorithmId: 'worst-fit',
    labId: CONTIGUOUS_LAB_ID,
    name: 'Worst Fit',
    description: 'Place a process in the largest free hole.',
    implemented: true,
  },
  {
    engineId: 'next-fit-engine',
    algorithmId: 'next-fit',
    labId: CONTIGUOUS_LAB_ID,
    name: 'Next Fit',
    description: 'Resume the search from the last placement and wrap around.',
    implemented: true,
  },
  {
    engineId: 'fixed-partitions-engine',
    algorithmId: 'fixed-partitions',
    labId: FIXED_PARTITIONS_LAB_ID,
    name: 'Fixed Partitions',
    description: 'Pre-divided partitions and the internal fragmentation they cause.',
    implemented: true,
  },
  {
    engineId: PAGING_ENGINE_ID,
    algorithmId: PAGING_ALGORITHM_ID,
    labId: PAGING_LAB_ID,
    name: 'Address Translation & the TLB',
    description:
      'Split a logical address into page and offset, walk a TLB-backed page table, fault absent pages, and form a physical address.',
    implemented: true,
  },
  {
    engineId: PAGE_REPLACEMENT_ENGINE_ID,
    algorithmId: REPLACEMENT_ALGORITHM_IDS.fifo,
    labId: PAGE_REPLACEMENT_LAB_ID,
    name: 'FIFO Page Replacement',
    description: 'Evict the page that has been resident the longest; can show Bélády’s anomaly.',
    implemented: true,
  },
  {
    engineId: PAGE_REPLACEMENT_ENGINE_ID,
    algorithmId: REPLACEMENT_ALGORITHM_IDS.optimal,
    labId: PAGE_REPLACEMENT_LAB_ID,
    name: 'Optimal Page Replacement',
    description: 'Evict the page whose next use lies furthest in the future — the theoretical bound.',
    implemented: true,
  },
  {
    engineId: PAGE_REPLACEMENT_ENGINE_ID,
    algorithmId: REPLACEMENT_ALGORITHM_IDS.lru,
    labId: PAGE_REPLACEMENT_LAB_ID,
    name: 'LRU Page Replacement',
    description: 'Evict the page that has gone unused the longest; immune to Bélády’s anomaly.',
    implemented: true,
  },
  {
    engineId: PAGE_REPLACEMENT_ENGINE_ID,
    algorithmId: REPLACEMENT_ALGORITHM_IDS.clock,
    labId: PAGE_REPLACEMENT_LAB_ID,
    name: 'Second Chance (Clock)',
    description: 'A reference bit and a sweeping hand approximate LRU cheaply.',
    implemented: true,
  },
  {
    engineId: DISK_ENGINE_ID,
    algorithmId: DISK_ALGORITHM_IDS.fcfs,
    labId: DISK_LAB_ID,
    name: 'Disk FCFS',
    description: 'Service the request queue in arrival order.',
    implemented: true,
  },
  {
    engineId: DISK_ENGINE_ID,
    algorithmId: DISK_ALGORITHM_IDS.sstf,
    labId: DISK_LAB_ID,
    name: 'Shortest Seek Time First',
    description: 'Always serve the request nearest the head; can starve far requests.',
    implemented: true,
  },
  {
    engineId: DISK_ENGINE_ID,
    algorithmId: DISK_ALGORITHM_IDS.scan,
    labId: DISK_LAB_ID,
    name: 'SCAN (Elevator)',
    description: 'Sweep to the disk edge, then reverse, bounding every request’s wait.',
    implemented: true,
  },
  {
    engineId: DISK_ENGINE_ID,
    algorithmId: DISK_ALGORITHM_IDS['c-scan'],
    labId: DISK_LAB_ID,
    name: 'C-SCAN',
    description: 'Sweep one way and return to the start without servicing, for uniform waits.',
    implemented: true,
  },
  {
    engineId: DISK_ENGINE_ID,
    algorithmId: DISK_ALGORITHM_IDS.look,
    labId: DISK_LAB_ID,
    name: 'LOOK',
    description: 'Reverse at the last request instead of travelling to the disk edge.',
    implemented: true,
  },
  {
    engineId: DISK_ENGINE_ID,
    algorithmId: DISK_ALGORITHM_IDS['c-look'],
    labId: DISK_LAB_ID,
    name: 'C-LOOK',
    description: 'Sweep one way and jump straight back to the lowest pending request.',
    implemented: true,
  },
  {
    engineId: FS_ENGINE_ID,
    algorithmId: ALLOCATION_ALGORITHM_IDS.contiguous,
    labId: FS_LAB_ID,
    name: 'Contiguous File Allocation',
    description:
      'Lay a file out in one unbroken run of blocks for the fastest sequential and random reads.',
    implemented: true,
  },
  {
    engineId: FS_ENGINE_ID,
    algorithmId: ALLOCATION_ALGORITHM_IDS.linked,
    labId: FS_LAB_ID,
    name: 'Linked File Allocation',
    description:
      'Chain any free blocks together with a pointer in each, so a file never external-fragments.',
    implemented: true,
  },
  {
    engineId: FS_ENGINE_ID,
    algorithmId: ALLOCATION_ALGORITHM_IDS.indexed,
    labId: FS_LAB_ID,
    name: 'Indexed File Allocation',
    description:
      'Record every block pointer in the inode (and an index block when needed) for O(1) random access.',
    implemented: true,
  },
];

const byAlgorithm = new Map<Id, EngineDescriptor>(DESCRIPTORS.map((item) => [item.algorithmId, item]));

export function listEngineDescriptors(): readonly EngineDescriptor[] {
  return DESCRIPTORS;
}

export function getEngineDescriptor(algorithmId: Id): EngineDescriptor | undefined {
  return byAlgorithm.get(algorithmId);
}

export function isSimulationImplemented(algorithmId: Id): boolean {
  return byAlgorithm.get(algorithmId)?.implemented === true;
}

export function listImplementedAlgorithmIds(): Id[] {
  return DESCRIPTORS.filter((item) => item.implemented).map((item) => item.algorithmId);
}
