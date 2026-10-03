export { PAGING_CONCEPT } from './concepts';
export type { PagingConcept } from './concepts';

export {
  PAGING_LAB_ID,
  PAGING_TOPIC_ID,
  pagingInput,
  pagingPresetOptions,
  runPagingInput,
} from './pagingRunners';

export {
  binaryAddress,
  byteLabel,
  hexAddress,
  pagingEventLabel,
  pagingLogEntries,
  pagingMetricItems,
  pagingTimelineEntries,
} from './pagingPresentation';

export { PagingWorkstation } from './PagingWorkstation';

export { AddressFlow } from './components/AddressFlow';
export type { AddressFlowProps } from './components/AddressFlow';
export { PageTableView } from './components/PageTableView';
export type { PageTableViewProps } from './components/PageTableView';
export { TlbView } from './components/TlbView';
export type { TlbViewProps } from './components/TlbView';
export { FrameView } from './components/FrameView';
export type { FrameViewProps } from './components/FrameView';
export { PagingEditor } from './components/PagingEditor';
export type { PagingEditorProps } from './components/PagingEditor';
export { PagingChallengePanel } from './components/PagingChallengePanel';
export type { PagingChallengePanelProps } from './components/PagingChallengePanel';

// Aliased so the aggregated feature index has no duplicate `draftFrom*` names.
export { draftFromInput as pagingDraftFromInput, draftFromPreset as pagingDraftFromPreset } from './drafts';
export type { PagingDraft } from './drafts';
