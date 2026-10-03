export { REPLACEMENT_CONCEPT } from './concepts';
export type { ReplacementConcept } from './concepts';

export {
  REPLACEMENT_LAB_ID,
  REPLACEMENT_TOPIC_ID,
  algorithmForAlgorithmId,
  replacementInput,
  replacementPresetOptions,
  runReplacementInput,
} from './replacementRunners';

export {
  algorithmLabel,
  referenceOutcomes,
  replacementEventLabel,
  replacementLogEntries,
  replacementMetricItems,
  replacementTimelineEntries,
} from './replacementPresentation';
export type { ReferenceOutcome } from './replacementPresentation';

export { PageReplacementWorkstation } from './PageReplacementWorkstation';
export type { PageReplacementWorkstationProps } from './PageReplacementWorkstation';

export { FrameStrip } from './components/FrameStrip';
export type { FrameStripProps } from './components/FrameStrip';
export { ReferenceStrip } from './components/ReferenceStrip';
export type { ReferenceStripProps } from './components/ReferenceStrip';
export { ReplacementEditor } from './components/ReplacementEditor';
export type { ReplacementEditorProps } from './components/ReplacementEditor';
export { ComparisonPanel } from './components/ComparisonPanel';
export type { ComparisonPanelProps } from './components/ComparisonPanel';
export { ReplacementChallengePanel } from './components/ReplacementChallengePanel';
export type { ReplacementChallengePanelProps } from './components/ReplacementChallengePanel';

// Aliased so the aggregated feature index has no duplicate `draftFrom*` names.
export { draftFromInput as replacementDraftFromInput, draftFromPreset as replacementDraftFromPreset } from './drafts';
export type { ReplacementDraft } from './drafts';
