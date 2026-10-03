export { ChallengeRunner } from './challenge';
export type { ChallengeRunnerProps } from './challenge';

export { GuidedLessonView, LessonCard, LessonStagePanel } from './learning';
export type { GuidedLessonViewProps, LessonCardProps, LessonStagePanelProps } from './learning';

export { ChallengeCard } from './challenges/ChallengeCard';
export type { ChallengeCardProps } from './challenges/ChallengeCard';
export { getReferenceSolution, hasReferenceSolution } from './challenges/referenceSolutions';
export type {
  ReferenceCell,
  ReferenceRow,
  ReferenceSolution,
} from './challenges/referenceSolutions';

export { ExampleCard } from './examples/ExampleCard';
export type { ExampleCardProps } from './examples/ExampleCard';

export { deriveAlgorithmConcept } from './lab/algorithmConcept';
export type { AlgorithmConcept } from './lab/algorithmConcept';
export { PlannedLab } from './lab/PlannedLab';
export type { PlannedLabProps } from './lab/PlannedLab';

export { AboutLab } from './landing/AboutLab';
export { ChallengeMode } from './landing/ChallengeMode';
export { DomainGrid } from './landing/DomainGrid';
export type { DomainGridProps } from './landing/DomainGrid';
export { FeaturedSimulation } from './landing/FeaturedSimulation';
export { Hero } from './landing/Hero';
export { LearningPath } from './landing/LearningPath';
export { QuickStart } from './landing/QuickStart';

export { conceptFor } from './scheduling/concepts';
export type { SchedulingConcept } from './scheduling/concepts';
export { SchedulingWorkstation } from './scheduling/SchedulingWorkstation';
export type { SchedulingWorkstationProps } from './scheduling/SchedulingWorkstation';
export { AlgorithmComparison } from './scheduling/components/AlgorithmComparison';
export { ChallengePanel } from './scheduling/components/ChallengePanel';
export { DecisionHistory } from './scheduling/components/DecisionHistory';
export { ExportResults } from './scheduling/components/ExportResults';
export { GanttChart } from './scheduling/components/GanttChart';
export { MiniGantt } from './scheduling/components/MiniGantt';
export { ProcessEditor } from './scheduling/components/ProcessEditor';
export { ProcessTable } from './scheduling/components/ProcessTable';
export { ScheduleBoard } from './scheduling/components/ScheduleBoard';
export {
  IDLE_COLOR,
  buildColourMap,
  cloneProcesses,
  decisionEntries,
  isProcessInput,
  logEntries,
  longestBurst,
  makeColourLookup,
  processName,
  processRows,
  scheduleMetricItems,
  scheduleSpan,
  timelineEntries,
} from './scheduling/schedulePresentation';

export {
  PROCESS_LIFECYCLE_CONCEPT,
  STATE_COLOR,
  STATE_TONE,
  isLifecycleInput,
  logEntriesFromEvents,
  parentName,
  processColor,
  processMetricItems,
  stateLabel,
  timelineFromEvents,
} from './process';
export { ProcessLifecycleWorkstation } from './process';
export { ContextSwitchDiagram } from './process';
export { PcbPanel } from './process';
export { ProcessActionBar } from './process';
export { ProcessRoster } from './process';
export { ProcessStateMachine } from './process';

export { SYNC_CONCEPTS } from './synchronization/concepts';
export {
  SYNC_CONFIG,
  defaultPresetId,
  presetsFor,
  runSynchronizationPreset,
  metricTone,
  syncLogEntries,
  syncMetricItems,
  syncTimelineEntries,
} from './synchronization';
export {
  BufferView,
  MutexWorkstation,
  PhilosophersView,
  PhilosophersWorkstation,
  ProducerConsumerWorkstation,
  RaceView,
  ReadersWritersView,
  ReadersWritersWorkstation,
  SyncBoard,
  SynchronizationWorkstation,
} from './synchronization';

export {
  BANKERS_LAB,
  BANKERS_TOPIC_ID,
  BankersBoard,
  BankersEditor,
  BankersWorkstation,
  COFFMAN_CONDITIONS,
  DEADLOCK_CONCEPTS,
  DeadlockChallengePanel,
  RAG_LAB,
  RagEditor,
  RagGraph,
  RagWorkstation,
  bankersMetricItems,
  bankersPresetOptions,
  deadlockLogEntries,
  deadlockMetricItems,
  deadlockTimelineEntries,
  draftFromInput,
  draftFromRagInput,
  isBankersData,
  isRagData,
  ragMetricItems,
  ragPresetOptions,
  runBankersInput,
  runRagInput,
  vectorLabel,
} from './deadlock';

export {
  CONTIGUOUS_LAB_ID,
  FIXED_LAB_ID,
  MEMORY_CONCEPTS,
  MEMORY_TOPIC_ID,
  MemoryChallengePanel,
  MemoryEditor,
  MemoryMap,
  MemoryWorkstation,
  algorithmIdFor,
  blockPercent,
  contiguousPresetOptions,
  draftFromPreset,
  fixedPresetOptions,
  formatUnits,
  memoryColorFor,
  memoryDraftFromInput,
  memoryInput,
  memoryLogEntries,
  memoryMetricItems,
  memoryTimelineEntries,
  runMemoryInput,
} from './memory';

export {
  AddressFlow,
  FrameView,
  PAGING_CONCEPT,
  PAGING_LAB_ID,
  PAGING_TOPIC_ID,
  PageTableView,
  PagingChallengePanel,
  PagingEditor,
  PagingWorkstation,
  TlbView,
  binaryAddress,
  byteLabel,
  hexAddress,
  pagingDraftFromInput,
  pagingDraftFromPreset,
  pagingEventLabel,
  pagingInput,
  pagingLogEntries,
  pagingMetricItems,
  pagingPresetOptions,
  pagingTimelineEntries,
  runPagingInput,
} from './paging';

export {
  ComparisonPanel,
  FrameStrip,
  PageReplacementWorkstation,
  REPLACEMENT_CONCEPT,
  REPLACEMENT_LAB_ID,
  REPLACEMENT_TOPIC_ID,
  ReferenceStrip,
  ReplacementChallengePanel,
  ReplacementEditor,
  algorithmForAlgorithmId,
  algorithmLabel,
  referenceOutcomes,
  replacementDraftFromInput,
  replacementDraftFromPreset,
  replacementEventLabel,
  replacementInput,
  replacementLogEntries,
  replacementMetricItems,
  replacementPresetOptions,
  replacementTimelineEntries,
  runReplacementInput,
} from './pageReplacement';

export {
  DISK_CONCEPT,
  DISK_LAB_ID_VALUE,
  DISK_TOPIC_ID,
  DiskChallengePanel,
  DiskComparisonPanel,
  DiskEditor,
  DiskTrack,
  DiskWorkstation,
  RequestQueue,
  SeekChart,
  cylinderPercent,
  diskAlgorithmLabel,
  diskDraftFromInput,
  diskDraftFromPreset,
  diskDirectionLabel,
  diskEventLabel,
  diskInput,
  diskLogEntries,
  diskMetricItems,
  diskPresetOptions,
  diskTimelineEntries,
  generateRequests,
  runDiskInput,
  serviceOrderLabel,
} from './disk';

export {
  BlockMap,
  DirectoryTree,
  FS_CONCEPT,
  FS_LAB_ID_VALUE,
  FS_TOPIC_ID,
  FragmentationChart,
  FragmentationPanel,
  FreeSpaceBitmap,
  FsChallengePanel,
  FsComparisonPanel,
  FsEditor,
  FsMetadataPanel,
  FsWorkstation,
  InodeTable,
  algorithmForAlgorithmId as fsAlgorithmForAlgorithmId,
  formatBytes,
  fsAllocationLabel,
  fsDraftFromInput,
  fsDraftFromPreset,
  fsEventLabel,
  fsInput,
  fsLogEntries,
  fsMetricItems,
  fsPresetOptions,
  fsTimelineEntries,
  runFsInput,
} from './fs';

export { LabCard } from './topics/LabCard';
export { TopicCard } from './topics/TopicCard';
