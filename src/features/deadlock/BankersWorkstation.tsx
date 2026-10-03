import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EducationalExample, SimulationState } from '@/types';
import type { BankersInput, BankersStepData } from '@/engine';
import { bankersEngine, createSimulationState, describeIssues, validateBankersInput } from '@/engine';
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
import { bankersMetricItems, deadlockLogEntries, deadlockTimelineEntries } from './deadlockPresentation';
import { BANKERS_LAB, BANKERS_TOPIC_ID, bankersPresetOptions } from './deadlockRunners';
import { BankersBoard } from './components/BankersBoard';
import { BankersEditor } from './components/BankersEditor';
import { draftFromInput, type BankersDraft } from './drafts';
import { DeadlockChallengePanel } from './components/DeadlockChallengePanel';

const ALGORITHM_ID = 'bankers-algorithm';

function isBankersInput(input: unknown): input is BankersInput {
  if (!input || typeof input !== 'object') return false;
  const candidate = input as Partial<BankersInput>;
  return Array.isArray(candidate.processes) && Array.isArray(candidate.allocation);
}

function emptyState(): SimulationState<BankersStepData> {
  return createSimulationState<BankersStepData>({
    labId: BANKERS_LAB,
    algorithmId: ALGORITHM_ID,
    steps: [],
  });
}

/**
 * Banker's algorithm, in two modes.
 *
 * **Simulate** lets the learner edit the Available / Max / Allocation matrices,
 * attach a request, and step through `Need = Max − Allocation` and the safety
 * algorithm one decision at a time. **Challenge** turns the same engine into
 * marked questions. Neither mode ever calls an unsafe state a deadlock.
 */
export function BankersWorkstation() {
  const query = useHashQuery();
  const presets = useMemo(() => bankersPresetOptions(), []);
  const fallback = useMemo(emptyState, []);

  const [draft, setDraft] = useState<BankersDraft>(() => {
    const requested = query.preset;
    const preset = presets.find((item) => item.id === requested) ?? presets[0]!;
    return draftFromInput(preset.input);
  });
  const [viewMode, setViewMode] = useState<'simulate' | 'challenge'>('simulate');

  // Follow the query string when the learner opens a preset deep link.
  useEffect(() => {
    const requested = query.preset;
    if (!requested) return;
    const preset = presets.find((item) => item.id === requested);
    if (preset) setDraft(draftFromInput(preset.input));
  }, [presets, query.preset]);

  const input = useMemo<BankersInput>(
    () => ({
      processes: draft.processes,
      resources: draft.resources,
      allocation: draft.allocation,
      max: draft.max,
      available: draft.available,
      ...(draft.requestProcess >= 0
        ? { request: { process: draft.requestProcess, resources: draft.request } }
        : {}),
    }),
    [draft],
  );

  const validation = useMemo(() => validateBankersInput(input), [input]);
  const run = useMemo(() => (validation.valid ? bankersEngine.run(input) : null), [input, validation]);

  const simulation = useSimulation<BankersStepData>({
    initialState: run?.state ?? fallback,
    baseStepMs: 850,
  });
  const { load } = simulation;

  useEffect(() => {
    if (run) load(run.state);
  }, [run, load]);

  const lab = getLab(BANKERS_LAB);
  const algorithm = getAlgorithm(ALGORITHM_ID);
  const topic = getTopic(BANKERS_TOPIC_ID);

  const loadExample = useCallback((example: EducationalExample<unknown>) => {
    if (!isBankersInput(example.input)) return;
    setDraft(draftFromInput(example.input));
  }, []);

  const resetLab = useCallback(() => {
    setDraft(draftFromInput(presets[0]!.input));
    simulation.reset();
  }, [presets, simulation]);

  if (!lab || !algorithm || !topic) return null;

  const concept = DEADLOCK_CONCEPTS.bankers;
  const currentIndex = simulation.state.currentStepIndex;
  const step = simulation.step;
  const data = step?.data;
  const simulating = viewMode === 'simulate';

  const viewToggle = (
    <div className="view-switch" role="group" aria-label="Banker’s view">
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
          caption={`${algorithm.name} — request handling and the safety check.`}
          {...(algorithm.pseudocode ? { code: algorithm.pseudocode } : {})}
        />
      }
      selectedExampleId={null}
      onSelectExample={loadExample}
      workload={
        simulating ? (
          <>
            {!validation.valid ? (
              <Callout tone="warning" title="Fix the matrices to run the simulation">
                <p>{describeIssues(validation)}</p>
              </Callout>
            ) : null}
            <Card aria-labelledby="matrices-heading">
              <h4 className="panel__title" id="matrices-heading">
                Matrices
              </h4>
              <BankersEditor draft={draft} onChange={setDraft} />
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
          <BankersBoard data={data} title="Safety check" />
        ) : null
      }
      metricsPanel={simulating && data ? <MetricsPanel metrics={bankersMetricItems(data)} /> : undefined}
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
                    { term: 'Phase', value: data.phase },
                    {
                      term: 'Verdict',
                      value: data.safe === null ? 'checking' : data.safe ? 'safe' : 'unsafe',
                    },
                    {
                      term: 'Request',
                      value: data.request ? `${data.request.process} · ${data.request.status}` : 'none',
                    },
                  ]
                : []
            }
          />
        ) : undefined
      }
      results={
        simulating ? (
          <Card aria-labelledby="formula-heading">
            <h4 className="panel__title" id="formula-heading">
              The rules
            </h4>
            <dl className="formula-list">
              <div>
                <dt>Need</dt>
                <dd>Max − Allocation</dd>
              </div>
              <div>
                <dt>Request test</dt>
                <dd>request ≤ need and request ≤ available</dd>
              </div>
              <div>
                <dt>Safe</dt>
                <dd>a completion order exists for every process</dd>
              </div>
              <div>
                <dt>Unsafe</dt>
                <dd>no safe sequence — avoided, not a deadlock</dd>
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
