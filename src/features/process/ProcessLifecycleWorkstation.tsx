import { useCallback, useEffect, useRef, useState } from 'react';
import type { EducationalExample } from '@/types';
import {
  Callout,
  CodePanel,
  ConceptBlock,
  EventLog,
  ExplanationPanel,
  LabShell,
  MetricsPanel,
  Timeline,
} from '@/components';
import {
  PROCESS_SCENE_PRESETS,
  applyAction,
  createSystem,
  findProcess,
  findScenePreset,
  runningProcess,
  seedSystem,
} from '@/engine';
import type { ProcessAction, ProcessEvent, ProcessScenePreset, ProcessSystem } from '@/engine';
import { getAlgorithm, getLab, getTopic } from '@/content';
import { useHashQuery } from '@/hooks';
import { PROCESS_LIFECYCLE_CONCEPT } from './concepts';
import { ProcessActionBar } from './components/ProcessActionBar';
import { ProcessRoster } from './components/ProcessRoster';
import { ProcessStateMachine } from './components/ProcessStateMachine';
import { ContextSwitchDiagram } from './components/ContextSwitchDiagram';
import { PcbPanel } from './components/PcbPanel';
import {
  isLifecycleInput,
  logEntriesFromEvents,
  processMetricItems,
  timelineFromEvents,
} from './processPresentation';

const LAB_ID = 'lab-process-lifecycle';
const ALGORITHM_ID = 'process-state-machine';

function sceneFromQuery(scene: string | undefined): ProcessScenePreset {
  return (scene ? findScenePreset(scene) : undefined) ?? PROCESS_SCENE_PRESETS[0]!;
}

/**
 * The interactive process-lifecycle lab.
 *
 * All state moves through the pure engine: this component only holds the current
 * system, the event log and the cursor, and every button asks the engine to apply
 * one action. Nothing about the state machine is duplicated in React.
 */
export function ProcessLifecycleWorkstation() {
  const query = useHashQuery();

  const [system, setSystem] = useState<ProcessSystem>(() => seedSystem(sceneFromQuery(query.scene).input));
  // Tracks the scene already applied so the effect only reacts to real changes.
  const appliedScene = useRef<string | undefined>(query.scene);
  const [events, setEvents] = useState<readonly ProcessEvent[]>([]);
  const [cursor, setCursor] = useState(0);
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [exampleId, setExampleId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const lab = getLab(LAB_ID);
  const algorithm = getAlgorithm(ALGORITHM_ID);
  const topic = getTopic('process-management');

  const runAction = useCallback(
    (action: ProcessAction) => {
      const outcome = applyAction(system, action);
      if (!outcome.ok) {
        setNotice(outcome.error);
        return;
      }
      setNotice(null);

      if (outcome.event.kind === 'reset') {
        setSystem(outcome.system);
        setEvents([outcome.event]);
        setCursor(0);
        setSelectedPid(null);
        setExampleId(null);
        return;
      }

      setSystem(outcome.system);
      setEvents((previous) => [...previous, outcome.event]);
      setCursor(events.length);
      setExampleId(null);
      if (action.kind === 'create') setSelectedPid(outcome.event.pid);
    },
    [system, events],
  );

  const loadInput = useCallback((next: ProcessSystem) => {
    setSystem(next);
    setEvents([]);
    setCursor(0);
    setSelectedPid(null);
    setNotice(null);
  }, []);

  const loadScene = useCallback(
    (preset: ProcessScenePreset) => {
      loadInput(seedSystem(preset.input));
      setExampleId(null);
    },
    [loadInput],
  );

  const loadExample = useCallback(
    (example: EducationalExample<unknown>) => {
      if (!isLifecycleInput(example.input)) return;
      loadInput(seedSystem(example.input));
      setExampleId(example.id);
    },
    [loadInput],
  );

  const resetLab = useCallback(() => {
    loadInput(createSystem());
    setExampleId(null);
  }, [loadInput]);

  // Deep link: `#/labs/lab-process-lifecycle?scene=io-wait` selects a scenario.
  const sceneParam = query.scene;
  useEffect(() => {
    if (sceneParam === appliedScene.current) return;
    appliedScene.current = sceneParam;
    const preset = sceneParam ? findScenePreset(sceneParam) : undefined;
    if (preset) loadInput(seedSystem(preset.input));
  }, [sceneParam, loadInput]);

  if (!lab || !algorithm || !topic) return null;

  const selected =
    selectedPid === null ? system.processes[0] : findProcess(system, selectedPid) ?? system.processes[0];
  const current = events[cursor];
  const running = runningProcess(system);

  return (
    <LabShell
      lab={lab}
      topicLabel={topic.title}
      concept={
        <ConceptBlock
          paragraphs={PROCESS_LIFECYCLE_CONCEPT.paragraphs}
          keyPoints={PROCESS_LIFECYCLE_CONCEPT.keyPoints}
          title={`${algorithm.name} — the concept`}
        />
      }
      codePanel={
        <CodePanel
          title="Lifecycle rules"
          caption="Every legal edge, and the bookkeeping each one implies."
          {...(algorithm.pseudocode ? { code: algorithm.pseudocode } : {})}
        />
      }
      workload={
        <ProcessRoster
          system={system}
          selectedPid={selected?.pid ?? null}
          onSelect={setSelectedPid}
          onCreate={(name) => runAction({ kind: 'create', ...(name === '' ? {} : { name }) })}
          onLoadScene={loadScene}
        />
      }
      selectedExampleId={exampleId}
      onSelectExample={loadExample}
      controls={
        <>
          {notice ? (
            <Callout tone="warning" title="That move is not allowed">
              <p>{notice}</p>
            </Callout>
          ) : null}
          <ProcessActionBar
            system={system}
            selected={selected}
            onAction={runAction}
            onReset={() => runAction({ kind: 'reset' })}
          />
        </>
      }
      visualization={
        <>
          <ProcessStateMachine
            system={system}
            event={current ?? null}
            selectedPid={selected?.pid ?? null}
          />
          <ContextSwitchDiagram system={system} event={current ?? null} />
        </>
      }
      metricsPanel={<MetricsPanel metrics={processMetricItems(system, events)} />}
      timeline={
        <Timeline
          entries={timelineFromEvents(events)}
          currentIndex={cursor}
          onSelect={setCursor}
          emptyMessage="The timeline fills in as you drive the system."
        />
      }
      eventLog={
        <EventLog
          entries={logEntriesFromEvents(events)}
          currentIndex={cursor}
          onSelect={setCursor}
          emptyMessage="No events yet. Admit and dispatch a process to begin."
        />
      }
      explanationPanel={
        <ExplanationPanel
          {...(current ? { label: current.label } : {})}
          {...(current ? { description: current.description } : {})}
          {...(current?.explanation ? { explanation: current.explanation } : {})}
          highlights={current?.highlights ?? []}
          facts={[
            { term: 'Clock', value: `t = ${system.clock}` },
            { term: 'On the CPU', value: running?.name ?? 'idle' },
            { term: 'Context switches', value: `${system.contextSwitches}` },
          ]}
          emptyMessage="Drive the system to see the reasoning behind every transition."
        />
      }
      results={<PcbPanel system={system} process={selected} />}
      onResetLab={resetLab}
      resetLabel="New scenario"
    />
  );
}
