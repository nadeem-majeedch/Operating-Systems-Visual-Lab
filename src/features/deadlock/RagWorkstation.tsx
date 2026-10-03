import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EducationalExample, SimulationState } from '@/types';
import type { RagInput, RagStepData } from '@/engine';
import { createSimulationState, describeIssues, ragEngine, validateRagInput } from '@/engine';
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
import { DEADLOCK_CONCEPTS } from './concepts';
import { deadlockLogEntries, deadlockTimelineEntries, ragMetricItems } from './deadlockPresentation';
import { RAG_LAB, BANKERS_TOPIC_ID, ragPresetOptions } from './deadlockRunners';
import { RagGraph } from './components/RagGraph';
import { RagEditor } from './components/RagEditor';
import { draftFromRagInput, type RagDraft } from './drafts';
import { DeadlockChallengePanel } from './components/DeadlockChallengePanel';

const ALGORITHM_ID = 'wait-for-graph';

function isRagInput(input: unknown): input is RagInput {
  if (!input || typeof input !== 'object') return false;
  const candidate = input as Partial<RagInput>;
  return Array.isArray(candidate.processes) && Array.isArray(candidate.instances);
}

function emptyState(): SimulationState<RagStepData> {
  return createSimulationState<RagStepData>({
    labId: RAG_LAB,
    algorithmId: ALGORITHM_ID,
    steps: [],
  });
}

/**
 * Resource-allocation graph and deadlock detection.
 *
 * The graph is built with a compact editor (each cell holds, requests or
 * nothing; each resource type carries an instance count), then revealed edge by
 * edge, collapsed into a wait-for graph, and finally tested — by cycle for
 * single-instance resources, by reduction otherwise.
 */
export function RagWorkstation() {
  const query = useHashQuery();
  const presets = useMemo(() => ragPresetOptions(), []);
  const fallback = useMemo(emptyState, []);

  const [draft, setDraft] = useState<RagDraft>(() => {
    const requested = query.preset;
    const preset = presets.find((item) => item.id === requested) ?? presets[0]!;
    return draftFromRagInput(preset.input);
  });
  const [viewMode, setViewMode] = useState<'simulate' | 'challenge'>('simulate');

  useEffect(() => {
    const requested = query.preset;
    if (!requested) return;
    const preset = presets.find((item) => item.id === requested);
    if (preset) setDraft(draftFromRagInput(preset.input));
  }, [presets, query.preset]);

  const input = useMemo<RagInput>(
    () => ({
      processes: draft.processes,
      resources: draft.resources,
      instances: draft.instances,
      allocation: draft.allocation,
      requests: draft.requests,
    }),
    [draft],
  );

  const validation = useMemo(() => validateRagInput(input), [input]);
  const run = useMemo(() => (validation.valid ? ragEngine.run(input) : null), [input, validation]);

  const simulation = useSimulation<RagStepData>({
    initialState: run?.state ?? fallback,
    baseStepMs: 900,
  });
  const { load } = simulation;

  useEffect(() => {
    if (run) load(run.state);
  }, [run, load]);

  const lab = getLab(RAG_LAB);
  const algorithm = getAlgorithm(ALGORITHM_ID);
  const topic = getTopic(BANKERS_TOPIC_ID);

  const loadExample = useCallback((example: EducationalExample<unknown>) => {
    if (!isRagInput(example.input)) return;
    setDraft(draftFromRagInput(example.input));
  }, []);

  const resetLab = useCallback(() => {
    setDraft(draftFromRagInput(presets[0]!.input));
    simulation.reset();
  }, [presets, simulation]);

  if (!lab || !algorithm || !topic) return null;

  const concept = DEADLOCK_CONCEPTS.rag;
  const currentIndex = simulation.state.currentStepIndex;
  const step = simulation.step;
  const data = step?.data;
  const simulating = viewMode === 'simulate';

  const viewToggle = (
    <div className="view-switch" role="group" aria-label="Graph view">
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
      topicLabel={topic.title}
      concept={
        <ConceptBlock paragraphs={concept.paragraphs} keyPoints={concept.keyPoints} title={concept.title} />
      }
      codePanel={
        <CodePanel
          title="Pseudocode"
          caption={`${algorithm.name} — cycle detection and the reduction algorithm.`}
          {...(algorithm.pseudocode ? { code: algorithm.pseudocode } : {})}
        />
      }
      selectedExampleId={null}
      onSelectExample={loadExample}
      workload={
        simulating ? (
          <>
            {!validation.valid ? (
              <Callout tone="warning" title="Fix the graph to run the simulation">
                <p>{describeIssues(validation)}</p>
              </Callout>
            ) : null}
            <Card aria-labelledby="graph-heading">
              <h4 className="panel__title" id="graph-heading">
                Build the graph
              </h4>
              <RagEditor draft={draft} onChange={setDraft} />
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
          <DeadlockChallengePanel />
        ) : data ? (
          <RagGraph data={data} />
        ) : null
      }
      metricsPanel={simulating && data ? <MetricsPanel metrics={ragMetricItems(data)} /> : undefined}
      timeline={
        simulating ? (
          <Timeline
            entries={deadlockTimelineEntries(simulation.state.steps)}
            currentIndex={currentIndex}
            onSelect={simulation.goToStep}
          />
        ) : undefined
      }
      eventLog={
        simulating ? (
          <EventLog
            entries={deadlockLogEntries(simulation.state.steps)}
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
                    { term: 'Stage', value: data.stage },
                    {
                      term: 'Verdict',
                      value:
                        data.deadlocked === null
                          ? 'undecided'
                          : data.deadlocked
                            ? 'deadlock'
                            : 'no deadlock',
                    },
                    { term: 'Cycles', value: data.cycle.length > 0 ? data.cycle.join(' → ') : 'none' },
                  ]
                : []
            }
          />
        ) : undefined
      }
      results={
        simulating ? (
          <Card aria-labelledby="graph-rules-heading">
            <h4 className="panel__title" id="graph-rules-heading">
              The rules
            </h4>
            <dl className="formula-list">
              <div>
                <dt>Allocation edge</dt>
                <dd>resource → holding process</dd>
              </div>
              <div>
                <dt>Request edge</dt>
                <dd>requesting process → resource</dd>
              </div>
              <div>
                <dt>Single instance</dt>
                <dd>a cycle is necessary and sufficient for deadlock</dd>
              </div>
              <div>
                <dt>Multiple instances</dt>
                <dd>use the reduction algorithm, never the cycle alone</dd>
              </div>
            </dl>
          </Card>
        ) : undefined
      }
      onResetLab={resetLab}
      resetLabel="Reset lab"
    />
  );
}
