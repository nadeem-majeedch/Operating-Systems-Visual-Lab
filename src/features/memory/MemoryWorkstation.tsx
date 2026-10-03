import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EducationalExample } from '@/types';
import type { FitPolicy, MemoryInput, MemoryOperation, MemoryStepData, PartitionMode } from '@/engine';
import {
  FIT_POLICIES,
  FIT_POLICY_LABELS,
  MAX_OPERATIONS,
  createSimulationState,
  describeIssues,
  memoryAlgorithmId,
  runMemory,
  validateMemoryInput,
} from '@/engine';
import {
  Button,
  Callout,
  Card,
  CodePanel,
  ConceptBlock,
  EventLog,
  ExplanationPanel,
  LabShell,
  MetricsPanel,
  SimulationControls,
  Timeline,
} from '@/components';
import { getAlgorithm, getLab, getTopic } from '@/content';
import { useHashQuery, useSimulation } from '@/hooks';
import { MEMORY_CONCEPTS } from './concepts';
import { memoryLogEntries, memoryMetricItems, memoryTimelineEntries } from './memoryPresentation';
import {
  CONTIGUOUS_LAB_ID,
  FIXED_LAB_ID,
  MEMORY_TOPIC_ID,
  contiguousPresetOptions,
  fixedPresetOptions,
  memoryInput,
} from './memoryRunners';
import { MemoryMap } from './components/MemoryMap';
import { MemoryEditor } from './components/MemoryEditor';
import { MemoryChallengePanel } from './components/MemoryChallengePanel';
import { draftFromInput, draftFromPreset, type MemoryDraft } from './drafts';

export interface MemoryWorkstationProps {
  readonly initialAlgorithmId: string;
}

function isFitPolicy(value: string): value is FitPolicy {
  return (FIT_POLICIES as readonly string[]).includes(value);
}

function isMemoryInput(input: unknown): input is MemoryInput {
  if (!input || typeof input !== 'object') return false;
  const candidate = input as Partial<MemoryInput>;
  return (
    (candidate.mode === 'fixed' || candidate.mode === 'variable') && Array.isArray(candidate.operations)
  );
}

/**
 * Contiguous and fixed-partition memory, in two modes.
 *
 * **Simulate** lets the learner choose a placement policy, create processes,
 * allocate and free them, and compact memory. Every action appends to a script
 * the engine replays, so the whole session is deterministic and can be stepped
 * through — the map, the metrics and the log are all derived from that script.
 * **Challenge** turns the same engine into marked questions.
 *
 * The lab's own id decides the partitioning scheme: `fixed-partitions` opens the
 * fixed-partition lab, any fit policy opens contiguous allocation.
 */
export function MemoryWorkstation({ initialAlgorithmId }: MemoryWorkstationProps) {
  const query = useHashQuery();
  const mode: PartitionMode = initialAlgorithmId === 'fixed-partitions' ? 'fixed' : 'variable';
  const labId = mode === 'fixed' ? FIXED_LAB_ID : CONTIGUOUS_LAB_ID;
  const presets = useMemo(
    () => (mode === 'fixed' ? fixedPresetOptions() : contiguousPresetOptions()),
    [mode],
  );
  const fallback = useMemo(
    () => createSimulationState<MemoryStepData>({ labId, algorithmId: initialAlgorithmId, steps: [] }),
    [labId, initialAlgorithmId],
  );

  const [policy, setPolicy] = useState<FitPolicy>(() =>
    isFitPolicy(initialAlgorithmId) ? initialAlgorithmId : 'first-fit',
  );
  const [draft, setDraft] = useState<MemoryDraft>(() => {
    const requested = query.preset;
    const preset = presets.find((item) => item.id === requested) ?? presets[0]!;
    return draftFromPreset(preset);
  });
  const [viewMode, setViewMode] = useState<'simulate' | 'challenge'>('simulate');

  // Follow the query string when the learner opens a preset deep link.
  useEffect(() => {
    const requested = query.preset;
    if (!requested) return;
    const preset = presets.find((item) => item.id === requested);
    if (preset) setDraft(draftFromPreset(preset));
  }, [presets, query.preset]);

  const input = useMemo<MemoryInput>(
    () => memoryInput(mode, policy, draft.totalSize, draft.partitions, draft.operations),
    [mode, policy, draft],
  );

  const validation = useMemo(() => validateMemoryInput(input), [input]);
  const run = useMemo(() => (validation.valid ? runMemory(input) : null), [input, validation]);

  const simulation = useSimulation<MemoryStepData>({
    initialState: run?.state ?? fallback,
    baseStepMs: 750,
  });
  const { load } = simulation;

  useEffect(() => {
    if (run) load(run.state);
  }, [run, load]);

  const lab = getLab(labId);
  const concept = MEMORY_CONCEPTS[mode === 'fixed' ? 'fixed' : 'contiguous'];

  const append = useCallback(
    (operation: MemoryOperation) => {
      setDraft((current) =>
        current.operations.length >= MAX_OPERATIONS
          ? current
          : { ...current, operations: [...current.operations, operation] },
      );
    },
    [],
  );

  const loadExample = useCallback((example: EducationalExample<unknown>) => {
    if (!isMemoryInput(example.input)) return;
    if (isFitPolicy(example.input.policy)) setPolicy(example.input.policy);
    setDraft(draftFromInput(example.input));
  }, []);

  const resetLab = useCallback(() => {
    setDraft(draftFromPreset(presets[0]!));
    simulation.reset();
  }, [presets, simulation]);

  if (!lab) return null;

  const topic = getTopic(MEMORY_TOPIC_ID);
  const algorithm = getAlgorithm(memoryAlgorithmId({ mode, policy }));
  const currentIndex = simulation.state.currentStepIndex;
  const step = simulation.step;
  const data = step?.data;
  const simulating = viewMode === 'simulate';
  // The editor's resident list reflects the outcome of every operation so far.
  const resident = run?.steps[run.steps.length - 1]?.data.resident ?? [];
  const full = draft.operations.length >= MAX_OPERATIONS;

  const viewToggle = (
    <div className="view-switch" role="group" aria-label="Memory view">
      <Button
        size="sm"
        variant={simulating ? 'primary' : 'ghost'}
        aria-pressed={simulating}
        onClick={() => setViewMode('simulate')}
      >
        Simulate
      </Button>
      <Button
        size="sm"
        variant={!simulating ? 'primary' : 'ghost'}
        aria-pressed={!simulating}
        onClick={() => setViewMode('challenge')}
      >
        Challenge mode
      </Button>
    </div>
  );

  return (
    <LabShell
      lab={lab}
      topicLabel={topic?.title ?? 'Memory Management'}
      concept={
        <ConceptBlock paragraphs={concept.paragraphs} keyPoints={concept.keyPoints} title={concept.title} />
      }
      codePanel={
        algorithm ? (
          <CodePanel
            title="Pseudocode"
            caption={`${algorithm.name} — placement and deallocation.`}
            {...(algorithm.pseudocode ? { code: algorithm.pseudocode } : {})}
          />
        ) : undefined
      }
      selectedExampleId={null}
      onSelectExample={loadExample}
      workload={
        simulating ? (
          <>
            {!validation.valid ? (
              <Callout tone="warning" title="Fix the layout to run the simulation">
                <p>{describeIssues(validation)}</p>
              </Callout>
            ) : null}
            <Card aria-labelledby="memory-editor-heading">
              <h4 className="panel__title" id="memory-editor-heading">
                Build the workload
              </h4>
              <MemoryEditor
                mode={mode}
                policy={policy}
                draft={draft}
                resident={resident}
                disabled={!validation.valid}
                onPolicyChange={setPolicy}
                onDraftChange={setDraft}
                onAllocate={(name, size) => append({ kind: 'allocate', name, size })}
                onDeallocate={(name) => append({ kind: 'deallocate', name })}
                onCompact={() => append({ kind: 'compact' })}
                onReset={resetLab}
                onPreset={(preset) => setDraft(draftFromPreset(preset))}
                presets={presets}
              />
            </Card>
          </>
        ) : undefined
      }
      controls={
        <>
          {viewToggle}
          {simulating ? (
            <SimulationControls
              status={simulation.state.status}
              stepIndex={currentIndex}
              stepCount={simulation.state.steps.length}
              isPlaying={simulation.isPlaying}
              canStepForward={simulation.canStepForward}
              canStepBackward={simulation.canStepBackward}
              speed={simulation.speed}
              disabled={!validation.valid}
              onPlayPause={simulation.togglePlay}
              onStepForward={simulation.stepForward}
              onStepBackward={simulation.stepBackward}
              onReset={simulation.reset}
              onSpeedChange={simulation.setSpeed}
            />
          ) : null}
        </>
      }
      visualization={
        !simulating ? (
          <MemoryChallengePanel />
        ) : data ? (
          <MemoryMap data={data} title="Memory map" />
        ) : null
      }
      metricsPanel={simulating && data ? <MetricsPanel metrics={memoryMetricItems(data)} /> : undefined}
      timeline={
        simulating ? (
          <Timeline
            entries={memoryTimelineEntries(simulation.state.steps)}
            currentIndex={currentIndex}
            onSelect={simulation.goToStep}
          />
        ) : undefined
      }
      eventLog={
        simulating ? (
          <EventLog
            entries={memoryLogEntries(simulation.state.steps)}
            currentIndex={currentIndex}
            onSelect={simulation.goToStep}
          />
        ) : undefined
      }
      explanationPanel={
        simulating ? (
          <ExplanationPanel
            {...(step ? { label: step.label } : {})}
            {...(step ? { description: step.description } : {})}
            {...(step?.explanation ? { explanation: step.explanation } : {})}
            highlights={step?.highlights ?? []}
            facts={
              data
                ? [
                    { term: 'Event', value: data.event },
                    { term: 'Policy', value: FIT_POLICY_LABELS[data.policy] },
                    { term: 'Active', value: data.activeProcess ?? '—' },
                    { term: 'Free blocks', value: `${data.freeBlocks}` },
                  ]
                : []
            }
          />
        ) : undefined
      }
      results={
        simulating ? (
          <Card aria-labelledby="memory-rules-heading">
            <h4 className="panel__title" id="memory-rules-heading">
              The rules
            </h4>
            <dl className="formula-list">
              <div>
                <dt>First fit</dt>
                <dd>first hole large enough</dd>
              </div>
              <div>
                <dt>Best fit</dt>
                <dd>smallest hole that still fits</dd>
              </div>
              <div>
                <dt>Worst fit</dt>
                <dd>largest hole available</dd>
              </div>
              <div>
                <dt>Next fit</dt>
                <dd>resume from the last placement, wrap around</dd>
              </div>
              <div>
                <dt>Compaction</dt>
                <dd>slide processes together to merge holes</dd>
              </div>
            </dl>
          </Card>
        ) : undefined
      }
      onResetLab={resetLab}
      resetLabel="Reset lab"
      children={
        full ? (
          <Callout tone="warning" title="Operation limit reached">
            <p>This workload is full — free a process, reset, or load another preset to continue.</p>
          </Callout>
        ) : undefined
      }
    />
  );
}
