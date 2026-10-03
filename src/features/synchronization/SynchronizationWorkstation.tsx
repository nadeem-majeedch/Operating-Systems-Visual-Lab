import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SyncKind, SyncStepData } from '@/engine';
import {
  Button,
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
import { SYNC_CONCEPTS } from './concepts';
import { syncLogEntries, syncMetricItems, syncTimelineEntries } from './syncPresentation';
import {
  SYNC_CONFIG,
  defaultPresetId,
  presetsFor,
  runSynchronizationPreset,
} from './synchronizationRunners';
import { SyncBoard } from './components/SyncBoard';
import { RaceView } from './components/RaceView';
import { BufferView } from './components/BufferView';
import { PhilosophersView } from './components/PhilosophersView';
import { ReadersWritersView } from './components/ReadersWritersView';

/** Kind-specific visualisation rendered below the shared actor board. */
function kindView(data: SyncStepData) {
  switch (data.kind) {
    case 'race':
      return <RaceView data={data} />;
    case 'producer-consumer':
      return <BufferView data={data} />;
    case 'philosophers':
      return <PhilosophersView data={data} />;
    case 'readers-writers':
      return <ReadersWritersView data={data} />;
  }
}

export interface SynchronizationWorkstationProps {
  readonly kind: SyncKind;
}

/**
 * One workstation for all four synchronization simulations.
 *
 * The engine is chosen by `kind`, but the shell, playback controls, timeline,
 * event log and explanation panel are identical — a learner who has used one lab
 * already knows how to use the rest. Playback is driven by the pure step list
 * the engine produced, so scrubbing is exact and reproducible.
 */
export function SynchronizationWorkstation({ kind }: SynchronizationWorkstationProps) {
  const query = useHashQuery();
  const config = SYNC_CONFIG[kind];
  const presets = useMemo(() => presetsFor(kind), [kind]);

  const [presetId, setPresetId] = useState<string>(() => {
    const requested = query.preset;
    return requested && presets.some((preset) => preset.id === requested)
      ? requested
      : defaultPresetId(kind);
  });

  // Deep link: `#/labs/lab-mutex?preset=race-semaphore`.
  useEffect(() => {
    const requested = query.preset;
    setPresetId(
      requested && presets.some((preset) => preset.id === requested)
        ? requested
        : defaultPresetId(kind),
    );
  }, [kind, presets, query.preset]);

  const run = useMemo(() => runSynchronizationPreset(kind, presetId), [kind, presetId]);
  const simulation = useSimulation<SyncStepData>({ initialState: run.state, baseStepMs: 800 });
  const { load } = simulation;

  useEffect(() => {
    load(run.state);
  }, [run, load]);

  const lab = getLab(config.labId);
  const algorithm = getAlgorithm(config.algorithmId);
  const topic = getTopic(config.topicId);

  const resetLab = useCallback(() => {
    setPresetId(defaultPresetId(kind));
    simulation.reset();
  }, [kind, simulation]);

  if (!lab || !algorithm || !topic) return null;

  const data = simulation.step?.data ?? run.steps[0]?.data;
  if (!data) return null;

  const concept = SYNC_CONCEPTS[kind];
  const preset = presets.find((item) => item.id === presetId);
  const currentIndex = simulation.state.currentStepIndex;
  const step = simulation.step;

  return (
    <LabShell
      lab={lab}
      topicLabel={topic.title}
      concept={
        <ConceptBlock
          paragraphs={concept.paragraphs}
          keyPoints={concept.keyPoints}
          title={concept.title}
        />
      }
      codePanel={
        <CodePanel
          title="Pseudocode"
          caption={`${algorithm.name} — the protocol, step by step.`}
          {...(algorithm.pseudocode ? { code: algorithm.pseudocode } : {})}
        />
      }
      workload={
        <Card aria-labelledby="scenario-heading">
          <h4 className="panel__title" id="scenario-heading">
            Scenario
          </h4>
          <div className="preset-picker" role="group" aria-label="Scenario presets">
            {presets.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={item.id === presetId ? 'primary' : 'secondary'}
                aria-pressed={item.id === presetId}
                onClick={() => setPresetId(item.id)}
                title={item.description}
              >
                {item.name}
              </Button>
            ))}
          </div>
          {preset ? <p className="preset-picker__note">{preset.description}</p> : null}
        </Card>
      }
      controls={
        <SimulationControls
          status={simulation.state.status}
          stepIndex={currentIndex}
          stepCount={simulation.state.steps.length}
          isPlaying={simulation.isPlaying}
          canStepForward={simulation.canStepForward}
          canStepBackward={simulation.canStepBackward}
          speed={simulation.speed}
          onPlayPause={simulation.togglePlay}
          onStepForward={simulation.stepForward}
          onStepBackward={simulation.stepBackward}
          onReset={simulation.reset}
          onSpeedChange={simulation.setSpeed}
        />
      }
      visualization={
        <>
          <SyncBoard data={data} title={config.stageTitle} />
          {kindView(data)}
        </>
      }
      metricsPanel={<MetricsPanel metrics={syncMetricItems(data)} />}
      timeline={
        <Timeline
          entries={syncTimelineEntries(simulation.state.steps)}
          currentIndex={currentIndex}
          onSelect={simulation.goToStep}
          emptyMessage="The timeline fills in as the simulation runs."
        />
      }
      eventLog={
        <EventLog
          entries={syncLogEntries(simulation.state.steps)}
          currentIndex={currentIndex}
          onSelect={simulation.goToStep}
          emptyMessage="No events yet."
        />
      }
      explanationPanel={
        <ExplanationPanel
          {...(step ? { label: step.label } : {})}
          {...(step ? { description: step.description } : {})}
          {...(step?.explanation ? { explanation: step.explanation } : {})}
          highlights={step?.highlights ?? []}
          facts={[
            { term: 'Clock', value: `t = ${data.clock}` },
            { term: 'Acting', value: data.activeActor ?? 'initialising' },
            { term: 'State', value: data.deadlocked ? 'deadlocked' : data.correct ? 'correct' : 'incorrect' },
          ]}
          emptyMessage="Press play or step forward to see why each action happened."
        />
      }
      onResetLab={resetLab}
      resetLabel="Reset scenario"
    />
  );
}
