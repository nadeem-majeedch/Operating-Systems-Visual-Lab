import type { ComponentType } from 'react';
import { Breadcrumb } from '@/components';
import { getLab, getTopic } from '@/content';
import { useDocumentTitle } from '@/hooks';
import { ROUTES } from '@/utils';
import { PlannedLab } from '@/features/lab/PlannedLab';
import { DiskWorkstation } from '@/features/disk/DiskWorkstation';
import { BankersWorkstation } from '@/features/deadlock/BankersWorkstation';
import { RagWorkstation } from '@/features/deadlock/RagWorkstation';
import { MemoryWorkstation } from '@/features/memory/MemoryWorkstation';
import { PagingWorkstation } from '@/features/paging/PagingWorkstation';
import { PageReplacementWorkstation } from '@/features/pageReplacement/PageReplacementWorkstation';
import { FsWorkstation } from '@/features/fs/FsWorkstation';
import { ProcessLifecycleWorkstation } from '@/features/process/ProcessLifecycleWorkstation';
import { SchedulingWorkstation } from '@/features/scheduling/SchedulingWorkstation';
import {
  MutexWorkstation,
  PhilosophersWorkstation,
  ProducerConsumerWorkstation,
  ReadersWritersWorkstation,
} from '@/features/synchronization/SynchronizationLabs';
import { NotFoundPage } from './NotFoundPage';

interface SimulatorProps {
  readonly initialAlgorithmId: string;
}

/**
 * Labs that have a working simulator.
 *
 * Both CPU scheduling labs open the same workstation; which algorithm it starts
 * on is decided by the lab's own content, and the learner can switch from there.
 */
const SIMULATORS: Readonly<Record<string, ComponentType<SimulatorProps>>> = {
  'lab-process-lifecycle': ProcessLifecycleWorkstation,
  'lab-fcfs': SchedulingWorkstation,
  'lab-sjf': SchedulingWorkstation,
  'lab-round-robin': SchedulingWorkstation,
  'lab-priority-scheduling': SchedulingWorkstation,
  'lab-mutex': MutexWorkstation,
  'lab-bounded-buffer': ProducerConsumerWorkstation,
  'lab-dining-philosophers': PhilosophersWorkstation,
  'lab-readers-writers': ReadersWritersWorkstation,
  'lab-bankers': BankersWorkstation,
  'lab-wait-for-graph': RagWorkstation,
  'lab-contiguous-allocation': MemoryWorkstation,
  'lab-fixed-partitions': MemoryWorkstation,
  'lab-tlb-translation': PagingWorkstation,
  'lab-page-replacement': PageReplacementWorkstation,
  'lab-disk-scheduling': DiskWorkstation,
  'lab-file-allocation': FsWorkstation,
};

export interface LabPageProps {
  readonly labId: string;
}

/**
 * Hosts a lab.
 *
 * Every lab renders the same shell: live simulators drive it directly, and labs
 * whose engine does not exist yet render the shell with the explicit
 * "coming in next module" state instead of a decorative stub.
 */
export function LabPage({ labId }: LabPageProps) {
  const lab = getLab(labId);
  useDocumentTitle(lab?.title);

  if (!lab) {
    return <NotFoundPage title="Lab not found" description={`No lab matches "${labId}".`} />;
  }

  const topic = getTopic(lab.topicId);
  const Simulator = SIMULATORS[labId];

  return (
    <div className="page">
      <Breadcrumb
        items={[
          { label: 'Home', path: ROUTES.home },
          ...(topic ? [{ label: topic.title, path: ROUTES.topic(topic.id) }] : []),
          { label: lab.title },
        ]}
      />

      {Simulator ? (
        <Simulator initialAlgorithmId={lab.algorithmIds[0] ?? ''} />
      ) : (
        <PlannedLab lab={lab} topicLabel={topic?.title ?? lab.topicId} />
      )}
    </div>
  );
}
