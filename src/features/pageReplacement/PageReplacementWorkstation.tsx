import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EducationalExample } from '@/types';
import {
  PAGE_REPLACEMENT_ALGORITHM_ID,
  createSimulationState,
  describeIssues,
  pageReplacementEngine,
  validatePageReplacementInput,
  type PageReplacementInput,
  type PageReplacementStepData,
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
import { REPLACEMENT_CONCEPT } from './concepts';
import {
  algorithmLabel,
  referenceOutcomes,
  replacementEventLabel,
  replacementLogEntries,
  replacementMetricItems,
  replacementTimelineEntries,
} from './replacementPresentation';
import {
  REPLACEMENT_LAB_ID,
  REPLACEMENT_TOPIC_ID,
  algorithmForAlgorithmId,
  replacementInput,
  replacementPresetOptions,
} from './replacementRunners';
import { draftFromInput, draftFromPreset, type ReplacementDraft } from './drafts';
import { FrameStrip } from './components/FrameStrip';
import { ReferenceStrip } from './components/ReferenceStrip';
import { ReplacementEditor } from './components/ReplacementEditor';
import { ComparisonPanel } from './components/ComparisonPanel';
import { ReplacementChallengePanel } from './components/ReplacementChallengePanel';

export interface PageReplacementWorkstationProps {
  readonly initialAlgorithmId: string;
}

function isReplacementInput(input: unknown): input is PageReplacementInput {
  if (!input || typeof input !== 'object') return false;
  const candidate = input as Partial<PageReplacementInput>;
  return typeof candidate.frameCount === 'number' && Array.isArray(candidate.referenceString);
}

/**
 * The page-replacement lab.
 *
 * **Simulate** picks a policy, a frame count and a reference string, then serves
 * every reference in order — each one shown as a hit or a page fault, with the
 * exact reason for any eviction. **Compare** runs all four policies over the
 * same string and plots the fault count as frames grow, which is where Bélády's
 * anomaly appears. **Challenge** turns the same engine into marked questions.
 */
export function PageReplacementWorkstation({ initialAlgorithmId }: PageReplacementWorkstationProps) {
  const query = useHashQuery();
  const presets = useMemo(() => replacementPresetOptions(), []);
  const initialAlgorithm = algorithmForAlgorithmId(initialAlgorithmId) ?? 'fifo';

  const fallback = useMemo(
    () =>
      createSimulationState<PageReplacementStepData>({
        labId: REPLACEMENT_LAB_ID,
        algorithmId: PAGE_REPLACEMENT_ALGORITHM_ID,
        steps: [],
      }),
    [],
  );

  const [draft, setDraft] = useState<ReplacementDraft>(() => {
    const preset = presets.find((item) => item.id === query.preset) ?? presets[0]!;
    const draft = draftFromPreset(preset);
    return preset.id === presets[0]!.id ? { ...draft, algorithm: initialAlgorithm } : draft;
  });
  const [viewMode, setViewMode] = useState<'simulate' | 'compare' | 'challenge'>('simulate');

  useEffect(() => {
    if (!query.preset) return;
    const preset = presets.find((item) => item.id === query.preset);
    if (preset) setDraft(draftFromPreset(preset));
  }, [presets, query.preset]);

  const input = useMemo<PageReplacementInput>(() => replacementInput(draft), [draft]);
  const validation = useMemo(() => validatePageReplacementInput(input), [input]);
  const run = useMemo(() => (validation.valid ? pageReplacementEngine.run(input) : null), [input, validation]);

  const simulation = useSimulation<PageReplacementStepData>({
    initialState: run?.state ?? fallback,
    baseStepMs: 700,
  });
  const { load } = simulation;

  useEffect(() => {
    if (run) load(run.state);
  }, [run, load]);

  const outcomes = useMemo(() => referenceOutcomes(simulation.state.steps), [simulation.state.steps]);

  const lab = getLab(REPLACEMENT_LAB_ID);
  const algorithm = getAlgorithm(PAGE_REPLACEMENT_ALGORITHM_ID);
  const topic = getTopic(REPLACEMENT_TOPIC_ID);

  const loadExample = useCallback((example: EducationalExample<unknown>) => {
    if (!isReplacementInput(example.input)) return;
    setDraft(draftFromInput(example.input));
  }, []);

  const resetLab = useCallback(() => {
    setDraft({ ...draftFromPreset(presets[0]!), algorithm: initialAlgorithm });
    simulation.reset();
  }, [presets, simulation, initialAlgorithm]);

  if (!lab) return null;

  const currentIndex = simulation.state.currentStepIndex;
  const step = simulation.step;
  const data = step?.data;
  const simulating = viewMode === 'simulate';
  const comparing = viewMode === 'compare';
  const currentReference = data?.referenceIndex ?? -1;

  const viewToggle = (
    <div className="view-switch" role="group" aria-label="Page replacement view">
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
        variant={comparing ? 'primary' : 'ghost'}
        aria-pressed={comparing}
        onClick={() => setViewMode('compare')}
      >
        Compare
      </Button>
      <Button
        size="sm"
        variant={viewMode === 'challenge' ? 'primary' : 'ghost'}
        aria-pressed={viewMode === 'challenge'}
        onClick={() => setViewMode('challenge')}
      >
        Challenge mode
      </Button>
    </div>
  );

  return (
    <LabShell
      lab={lab}
      topicLabel={topic?.title ?? 'Virtual Memory'}
      concept={
        <ConceptBlock
          paragraphs={REPLACEMENT_CONCEPT.paragraphs}
          keyPoints={REPLACEMENT_CONCEPT.keyPoints}
          title={REPLACEMENT_CONCEPT.title}
        />
      }
      codePanel={
        algorithm ? (
          <CodePanel
            title="Pseudocode"
            caption={`${algorithm.name} — choosing a victim.`}
            {...(algorithm.pseudocode ? { code: algorithm.pseudocode } : {})}
          />
        ) : undefined
      }
      selectedExampleId={null}
      onSelectExample={loadExample}
      workload={
        simulating || comparing ? (
          <>
            {!validation.valid ? (
              <Callout tone="warning" title="Fix the workload to run the simulation">
                <p>{describeIssues(validation)}</p>
              </Callout>
            ) : null}
            <Card aria-labelledby="replacement-editor-heading">
              <h4 className="panel__title" id="replacement-editor-heading">
                Configure the workload
              </h4>
              <ReplacementEditor
                draft={draft}
                disabled={!validation.valid}
                presets={presets}
                onChange={setDraft}
                onPreset={(preset) => setDraft(draftFromPreset(preset))}
                onReset={resetLab}
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
        viewMode === 'challenge' ? (
          <ReplacementChallengePanel />
        ) : comparing ? (
          <ComparisonPanel referenceString={draft.referenceString} frameCount={draft.frameCount} />
        ) : data ? (
          <div className="replacement-visual">
            <FrameStrip data={data} />
            <ReferenceStrip outcomes={outcomes} currentIndex={currentReference} />
          </div>
        ) : null
      }
      metricsPanel={simulating && data ? <MetricsPanel metrics={replacementMetricItems(data)} /> : undefined}
      timeline={
        simulating ? (
          <Timeline
            entries={replacementTimelineEntries(simulation.state.steps)}
            currentIndex={currentIndex}
            onSelect={simulation.goToStep}
          />
        ) : undefined
      }
      eventLog={
        simulating ? (
          <EventLog
            entries={replacementLogEntries(simulation.state.steps)}
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
                    { term: 'Event', value: replacementEventLabel(data.event) },
                    { term: 'Policy', value: algorithmLabel(data.algorithm) },
                    { term: 'Reference', value: data.reference >= 0 ? `${data.reference}` : '—' },
                    {
                      term: 'Victim',
                      value: data.victimPage === null ? '—' : `page ${data.victimPage} (frame ${data.victimFrame})`,
                    },
                  ]
                : []
            }
          />
        ) : undefined
      }
      results={
        simulating ? (
          <Card aria-labelledby="replacement-rules-heading">
            <h4 className="panel__title" id="replacement-rules-heading">
              The rules
            </h4>
            <dl className="formula-list">
              <div>
                <dt>Hit</dt>
                <dd>the page is already resident</dd>
              </div>
              <div>
                <dt>Fault</dt>
                <dd>the page is not resident; load it in</dd>
              </div>
              <div>
                <dt>FIFO</dt>
                <dd>evict the longest-resident page</dd>
              </div>
              <div>
                <dt>LRU</dt>
                <dd>evict the least recently used page</dd>
              </div>
              <div>
                <dt>OPT</dt>
                <dd>evict the page needed furthest in the future</dd>
              </div>
              <div>
                <dt>Clock</dt>
                <dd>sweep the reference bits, evict the first clear one</dd>
              </div>
              <div>
                <dt>Hit ratio</dt>
                <dd>hits ÷ references</dd>
              </div>
            </dl>
          </Card>
        ) : undefined
      }
      onResetLab={resetLab}
      resetLabel="Reset lab"
      children={
        comparing ? (
          <Callout tone="info" title="Comparison mode">
            <p>
              The same reference string is replayed under every policy. The table below the chart is where
              Bélády&rsquo;s anomaly shows up: under FIFO a fault count can rise as frames are added.
            </p>
          </Callout>
        ) : undefined
      }
    />
  );
}
