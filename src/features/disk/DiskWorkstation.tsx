import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EducationalExample } from '@/types';
import {
  DISK_ALGORITHM_LABELS,
  DISK_SCHEDULING_ALGORITHM_ID,
  createSimulationState,
  describeIssues,
  diskSchedulingEngine,
  validateDiskInput,
  type DiskInput,
  type DiskStepData,
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
import { DISK_CONCEPT } from './concepts';
import {
  diskEventLabel,
  diskLogEntries,
  diskMetricItems,
  diskTimelineEntries,
  serviceOrderLabel,
} from './diskPresentation';
import {
  DISK_LAB_ID_VALUE,
  DISK_TOPIC_ID,
  algorithmForAlgorithmId,
  diskInput,
  diskPresetOptions,
} from './diskRunners';
import { draftFromInput, draftFromPreset, type DiskDraft } from './drafts';
import { DiskTrack } from './components/DiskTrack';
import { RequestQueue } from './components/RequestQueue';
import { SeekChart } from './components/SeekChart';
import { DiskEditor } from './components/DiskEditor';
import { DiskComparisonPanel } from './components/DiskComparisonPanel';
import { DiskChallengePanel } from './components/DiskChallengePanel';

export interface DiskWorkstationProps {
  readonly initialAlgorithmId: string;
}

function isDiskInput(input: unknown): input is DiskInput {
  if (!input || typeof input !== 'object') return false;
  const candidate = input as Partial<DiskInput>;
  return typeof candidate.diskSize === 'number' && Array.isArray(candidate.requests);
}

/**
 * The disk-scheduling lab.
 *
 * **Simulate** configures a policy, a cylinder range, an initial head (and sweep
 * direction) and a request queue, then animates every head movement — a service,
 * an edge seek or a circular return — with the reason for each. **Compare** runs
 * all six policies over the same queue. **Challenge** turns the engine into
 * marked questions.
 */
export function DiskWorkstation({ initialAlgorithmId }: DiskWorkstationProps) {
  const query = useHashQuery();
  const presets = useMemo(() => diskPresetOptions(), []);
  const initialAlgorithm = algorithmForAlgorithmId(initialAlgorithmId) ?? 'fcfs';

  const fallback = useMemo(
    () =>
      createSimulationState<DiskStepData>({
        labId: DISK_LAB_ID_VALUE,
        algorithmId: DISK_SCHEDULING_ALGORITHM_ID,
        steps: [],
      }),
    [],
  );

  const [draft, setDraft] = useState<DiskDraft>(() => {
    const preset = presets.find((item) => item.id === query.preset) ?? presets[0]!;
    const base = draftFromPreset(preset);
    return preset.id === presets[0]!.id ? { ...base, algorithm: initialAlgorithm } : base;
  });
  const [viewMode, setViewMode] = useState<'simulate' | 'compare' | 'challenge'>('simulate');

  useEffect(() => {
    if (!query.preset) return;
    const preset = presets.find((item) => item.id === query.preset);
    if (preset) setDraft(draftFromPreset(preset));
  }, [presets, query.preset]);

  const input = useMemo<DiskInput>(() => diskInput(draft), [draft]);
  const validation = useMemo(() => validateDiskInput(input), [input]);
  const run = useMemo(() => (validation.valid ? diskSchedulingEngine.run(input) : null), [input, validation]);

  const simulation = useSimulation<DiskStepData>({
    initialState: run?.state ?? fallback,
    baseStepMs: 700,
  });
  const { load } = simulation;

  useEffect(() => {
    if (run) load(run.state);
  }, [run, load]);

  const lab = getLab(DISK_LAB_ID_VALUE);
  const algorithm = getAlgorithm(DISK_SCHEDULING_ALGORITHM_ID);
  const topic = getTopic(DISK_TOPIC_ID);

  const loadExample = useCallback((example: EducationalExample<unknown>) => {
    if (!isDiskInput(example.input)) return;
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

  const viewToggle = (
    <div className="view-switch" role="group" aria-label="Disk scheduling view">
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
      topicLabel={topic?.title ?? 'Disk Scheduling'}
      concept={
        <ConceptBlock
          paragraphs={DISK_CONCEPT.paragraphs}
          keyPoints={DISK_CONCEPT.keyPoints}
          title={DISK_CONCEPT.title}
        />
      }
      codePanel={
        algorithm ? (
          <CodePanel
            title="Pseudocode"
            caption={`${algorithm.name} — ordering the queue.`}
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
            <Card aria-labelledby="disk-editor-heading">
              <h4 className="panel__title" id="disk-editor-heading">
                Configure the workload
              </h4>
              <DiskEditor
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
          <DiskChallengePanel />
        ) : comparing ? (
          <DiskComparisonPanel
            diskSize={draft.diskSize}
            head={draft.head}
            requests={draft.requests}
            direction={draft.direction}
          />
        ) : data ? (
          <div className="disk-visual">
            <DiskTrack data={data} />
            <SeekChart steps={simulation.state.steps} currentIndex={currentIndex} />
            <RequestQueue data={data} />
          </div>
        ) : null
      }
      metricsPanel={simulating && data ? <MetricsPanel metrics={diskMetricItems(data)} /> : undefined}
      timeline={
        simulating ? (
          <Timeline
            entries={diskTimelineEntries(simulation.state.steps)}
            currentIndex={currentIndex}
            onSelect={simulation.goToStep}
          />
        ) : undefined
      }
      eventLog={
        simulating ? (
          <EventLog
            entries={diskLogEntries(simulation.state.steps)}
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
                    { term: 'Event', value: diskEventLabel(data.event) },
                    { term: 'Policy', value: DISK_ALGORITHM_LABELS[data.algorithm] },
                    { term: 'Movement', value: `${data.movement} cylinders` },
                    { term: 'Head', value: `${data.previousHead} → ${data.head}` },
                    { term: 'Served', value: serviceOrderLabel(data.servicedOrder) },
                  ]
                : []
            }
          />
        ) : undefined
      }
      results={
        simulating ? (
          <Card aria-labelledby="disk-rules-heading">
            <h4 className="panel__title" id="disk-rules-heading">
              The rules
            </h4>
            <dl className="formula-list">
              <div>
                <dt>Seek cost</dt>
                <dd>grows with |target − head|</dd>
              </div>
              <div>
                <dt>Total head movement</dt>
                <dd>sum of every consecutive hop</dd>
              </div>
              <div>
                <dt>Average seek</dt>
                <dd>total movement ÷ requests served</dd>
              </div>
              <div>
                <dt>FCFS</dt>
                <dd>arrival order — fair, but blind to distance</dd>
              </div>
              <div>
                <dt>SSTF</dt>
                <dd>nearest request first — can starve</dd>
              </div>
              <div>
                <dt>SCAN / LOOK</dt>
                <dd>sweep then reverse; LOOK stops at the last request</dd>
              </div>
              <div>
                <dt>C-SCAN / C-LOOK</dt>
                <dd>sweep one way, return without servicing</dd>
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
              Every policy is replayed over the same queue, head and direction. Total movement says how much
              work the head does; the longest single hop says how bad the worst wait can get.
            </p>
          </Callout>
        ) : undefined
      }
    />
  );
}
