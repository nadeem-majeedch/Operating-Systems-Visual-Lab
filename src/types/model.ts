import type {
  ContentStatus,
  DifficultyLevel,
  Id,
  SimulationStatus,
  TopicId,
} from './common';

/* -------------------------------------------------------------------------- */
/* Algorithms                                                                 */
/* -------------------------------------------------------------------------- */

/** A tunable input exposed to the learner by a simulator. */
export interface AlgorithmParameter {
  readonly id: Id;
  readonly name: string;
  readonly description: string;
  readonly kind: 'number' | 'boolean' | 'select';
  readonly defaultValue: ParameterValue;
  /** Bounds for `kind: 'number'`. */
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /** Choices for `kind: 'select'`. */
  readonly options?: readonly AlgorithmParameterOption[];
}

export interface AlgorithmParameterOption {
  readonly value: string;
  readonly label: string;
}

export type ParameterValue = number | boolean | string;

/**
 * Metadata for a single OS algorithm. The engine that actually executes it is
 * registered separately (`src/engine/registry.ts`) which keeps content,
 * algorithms and visuals independent of each other.
 */
export interface Algorithm {
  readonly id: Id;
  readonly name: string;
  readonly abbreviation?: string;
  readonly topicId: TopicId;
  readonly summary: string;
  readonly description: string;
  readonly difficulty: DifficultyLevel;
  readonly status: ContentStatus;
  readonly parameters: readonly AlgorithmParameter[];
  readonly properties: AlgorithmProperties;
  readonly tags: readonly string[];
  /**
   * Teaching pseudocode shown in the lab's code panel. Omitted for algorithms
   * whose step-by-step form is still being written — the panel says so instead
   * of inventing a listing.
   */
  readonly pseudocode?: string;
}

export interface AlgorithmProperties {
  /** Theoretical run time of the algorithm under study. */
  readonly timeComplexity?: string;
  /** Auxiliary space the algorithm needs. */
  readonly spaceComplexity?: string;
  /** Does the algorithm guarantee an optimal outcome? */
  readonly optimal?: boolean;
  /** Can the schedule be interrupted mid-execution? */
  readonly preemptive?: boolean;
  /** Can it make decisions with no future knowledge? */
  readonly online?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Simulation                                                                 */
/* -------------------------------------------------------------------------- */

/** A single recorded moment in a simulation — the unit of explanation. */
export interface SimulationStep<TData = unknown> {
  readonly id: Id;
  /** Zero-based position inside the owning `SimulationState.steps` array. */
  readonly index: number;
  readonly label: string;
  /** One-sentence summary of what just happened. */
  readonly description: string;
  /** Longer teaching note shown in the explanation panel. */
  readonly explanation?: string;
  /** Logical clock value of this step (quantum, tick, instruction number, ...). */
  readonly clock: number;
  /** Identifiers of entities the visualisation should emphasise. */
  readonly highlights: readonly Id[];
  /** Algorithm-specific snapshot rendered by the feature visualisation. */
  readonly data: TData;
  /** Optional numeric readouts surfaced as tiles next to the visualisation. */
  readonly metrics?: Readonly<Record<string, number>>;
}

/** Everything needed to drive, debug and replay one simulator run. */
export interface SimulationState<TData = unknown> {
  readonly labId: Id;
  readonly algorithmId: Id;
  readonly status: SimulationStatus;
  /** Playback rate multiplier (1 = one step per base tick). */
  readonly speed: number;
  readonly currentStepIndex: number;
  readonly steps: readonly SimulationStep<TData>[];
  readonly parameters: Readonly<Record<string, ParameterValue>>;
  readonly error: string | null;
}

export interface SimulationConfig {
  /** Playback speed multiplier, clamped by the engine helpers. */
  readonly speed?: number;
}

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly issues: readonly ValidationIssue[] };

/* -------------------------------------------------------------------------- */
/* Educational content                                                        */
/* -------------------------------------------------------------------------- */

/** A worked example that grounds an algorithm in a concrete scenario. */
export interface EducationalExample<TInput = unknown> {
  readonly id: Id;
  readonly title: string;
  readonly scenario: string;
  readonly difficulty: DifficultyLevel;
  /**
   * Ready-to-load input for the owning simulator. Omitted for conceptual
   * examples that belong to labs whose simulator is still `planned`.
   */
  readonly input?: TInput;
  readonly expectedOutcome: string;
  /** Follow-up questions that make the learner reason about the result. */
  readonly discussion: readonly string[];
  readonly hints: readonly string[];
}

/** A single interactive activity inside a topic. */
export interface Lab<TExampleInput = unknown> {
  readonly id: Id;
  readonly topicId: TopicId;
  readonly title: string;
  readonly summary: string;
  readonly description: string;
  readonly difficulty: DifficultyLevel;
  readonly status: ContentStatus;
  readonly estimatedMinutes: number;
  /** Algorithms offered by this lab, in suggested teaching order. */
  readonly algorithmIds: readonly Id[];
  readonly objectives: readonly string[];
  readonly examples: readonly EducationalExample<TExampleInput>[];
}


/**
 * A practice challenge: a problem the learner solves using a lab, marked
 * against an explicitly stated outcome rather than a hidden answer key.
 */
export interface Challenge {
  readonly id: Id;
  readonly topicId: TopicId;
  readonly title: string;
  /** The task, phrased as an instruction. */
  readonly prompt: string;
  readonly scenario: string;
  readonly difficulty: DifficultyLevel;
  readonly estimatedMinutes: number;
  /** What a submission must demonstrate to count as solved. */
  readonly requirements: readonly string[];
  readonly hints: readonly string[];
  readonly expectedOutcome: string;
  /** Lab where the challenge can be attempted, when a simulator exists. */
  readonly labId?: Id;
  readonly tags: readonly string[];
}

/* -------------------------------------------------------------------------- */
/* Guided learning                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The six stages every guided lesson walks through, in order.
 *
 * The sequence is deliberately fixed: understand the idea, see it, try it,
 * have it walked through, be tested, then reflect. Every lesson is authored to
 * the same shape so one view can render all of them.
 */
export type LessonStageKind =
  | 'concept'
  | 'visualization'
  | 'experiment'
  | 'walkthrough'
  | 'challenge'
  | 'reflection';

/** A term a student should be able to define after the concept stage. */
export interface KeyTerm {
  readonly term: string;
  readonly definition: string;
}

/** One numbered step of the guided walkthrough. */
export interface LessonStep {
  readonly title: string;
  readonly detail: string;
}

/** A belief students commonly hold that the lesson has to correct. */
export interface LessonMistake {
  readonly mistake: string;
  readonly correction: string;
}

interface LessonStageBase {
  readonly kind: LessonStageKind;
  readonly title: string;
  /** One line shown in the collapsed stage header. */
  readonly summary: string;
  readonly estimatedMinutes: number;
}

/** Stage 1 — the idea, in plain language. */
export interface ConceptStage extends LessonStageBase {
  readonly kind: 'concept';
  readonly intro: string;
  readonly points: readonly string[];
}

/** Stage 2 — the lab that makes the idea visible. */
export interface VisualizationStage extends LessonStageBase {
  readonly kind: 'visualization';
  readonly labId: Id;
  readonly note: string;
  /** What to look at first when the lab opens. */
  readonly focus: readonly string[];
}

/** Stage 3 — a hands-on experiment with something to observe. */
export interface ExperimentStage extends LessonStageBase {
  readonly kind: 'experiment';
  readonly labId: Id;
  /** What to set up before pressing play. */
  readonly setup: string;
  readonly observations: readonly string[];
}

/** Stage 4 — a worked, step-by-step walkthrough of a run. */
export interface WalkthroughStage extends LessonStageBase {
  readonly kind: 'walkthrough';
  readonly steps: readonly LessonStep[];
}

/** Stage 5 — graded questions drawn from the challenge engine. */
export interface ChallengeStage extends LessonStageBase {
  readonly kind: 'challenge';
  /** Challenge-engine bank ids whose questions belong to this lesson. */
  readonly bankIds: readonly string[];
  readonly note: string;
}

/** Stage 6 — reflection prompts, answered privately. */
export interface ReflectionStage extends LessonStageBase {
  readonly kind: 'reflection';
  readonly prompts: readonly string[];
}

export type LessonStage =
  | ConceptStage
  | VisualizationStage
  | ExperimentStage
  | WalkthroughStage
  | ChallengeStage
  | ReflectionStage;

/**
 * A complete, reusable guided lesson for one learning area.
 *
 * Stages carry their own content, so the lesson view is a single map over
 * `stages` with no per-topic branching. Objectives, prerequisites, key terms and
 * common mistakes live on the lesson because they frame every stage.
 */
export interface GuidedLesson {
  readonly topicId: TopicId;
  readonly title: string;
  readonly subtitle: string;
  readonly difficulty: DifficultyLevel;
  /** Total time across every stage. */
  readonly estimatedMinutes: number;
  readonly objectives: readonly string[];
  readonly prerequisites: readonly TopicId[];
  readonly keyTerms: readonly KeyTerm[];
  readonly commonMistakes: readonly LessonMistake[];
  readonly stages: readonly LessonStage[];
}

/** One of the eight major learning areas of the lab. */
export interface Topic {
  readonly id: TopicId;
  readonly title: string;
  readonly tagline: string;
  readonly description: string;
  /** Emoji glyph used for the card badge (decorative, hidden from AT). */
  readonly glyph: string;
  /** CSS colour token used for the topic accent. */
  readonly accent: string;
  readonly difficulty: DifficultyLevel;
  readonly estimatedMinutes: number;
  readonly prerequisites: readonly TopicId[];
  readonly objectives: readonly string[];
  readonly labs: readonly Lab[];
}
