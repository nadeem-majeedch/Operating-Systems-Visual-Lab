import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EducationalExample, ParameterValue, SimulationState } from '@/types';
import type { Process, ScheduleStepData } from '@/engine';
import {
  DEFAULT_QUANTUM,
  FCFS_PRESET,
  PROCESS_PRESETS,
  computeMetrics,
  createSimulationState,
  describeIssues,
  listImplementedAlgorithmIds,
  orderByArrival,
} from '@/engine';
import { runSchedulingAlgorithm, validateSchedulingInput } from './algorithmRunners';
import { AlgorithmComparison } from './components/AlgorithmComparison';
import { ChallengePanel } from './components/ChallengePanel';
import { DecisionHistory } from './components/DecisionHistory';
import { ExportResults } from './components/ExportResults';
import {
  AlgorithmSelector,
  Button,
  Callout,
  Card,
  CodePanel,
  ConceptBlock,
  EventLog,
  ExplanationPanel,
  LabShell,
  MetricsPanel,
  ParameterPanel,
  SimulationControls,
  Timeline,
  normaliseParameters,
  numericParameter,
} from '@/components';
import { getAlgorithm, getAlgorithmsForTopic, getLabForAlgorithm, getTopic } from '@/content';
import { queryNumber, useHashQuery, useSimulation } from '@/hooks';
import { formatNumber, formatPercent } from '@/utils';
import { conceptFor } from './concepts';
import { ProcessEditor } from './components/ProcessEditor';
import { ProcessTable } from './components/ProcessTable';
import { ScheduleBoard } from './components/ScheduleBoard';
import {
  buildColourMap,
  cloneProcesses,
  decisionEntries,
  isProcessInput,
  logEntries,
  makeColourLookup,
  processName,
  processRows,
  scheduleMetricItems,
  scheduleSpan,
  timelineEntries,
} from './schedulePresentation';
import type { ScheduleExtras } from './schedulePresentation';

const TOPIC_ID = 'cpu-scheduling';

function emptyState(): SimulationState<ScheduleStepData> {
  return createSimulationState<ScheduleStepData>({
    labId: 'lab-fcfs',
    algorithmId: 'fcfs',
    steps: [],
  });
}

export interface SchedulingWorkstationProps {
  /** Algorithm selected when the lab page opens. */
  readonly initialAlgorithmId: string;
}

/**
 * CPU scheduling workstation.
 *
 * One shell, one workload, several engines: the algorithm selector swaps the
 * engine, its parameters, its pseudocode and its concept text, while the
 * workload and the visualisation stay put so results are directly comparable.
 * Algorithms without an engine render the honest "coming in next module" state.
 */
export function SchedulingWorkstation({ initialAlgorithmId }: SchedulingWorkstationProps) {
  const query = useHashQuery();
  const { workload: workloadParam, quantum: quantumParam, algorithm: algorithmParam } = query;

  const algorithms = useMemo(() => getAlgorithmsForTopic(TOPIC_ID), []);
  const implementedIds = useMemo(() => listImplementedAlgorithmIds(), []);

  const [algorithmId, setAlgorithmId] = useState<string>(() => {
    const requested = algorithmParam ?? initialAlgorithmId;
    return algorithms.some((item) => item.id === requested) ? requested : 'fcfs';
  });
  const [processes, setProcesses] = useState<readonly Process[]>(() => cloneProcesses(FCFS_PRESET));
  const [parameters, setParameters] = useState<Readonly<Record<string, ParameterValue>>>({});
  const [viewMode, setViewMode] = useState<'simulate' | 'compare' | 'challenge'>('simulate');

  // Follow the route when the learner moves between scheduling labs.
  useEffect(() => {
    setAlgorithmId((current) => (current === initialAlgorithmId ? current : initialAlgorithmId));
  }, [initialAlgorithmId]);

  // Deep links: ?workload=convoy and ?quantum=2 configure the station.
  useEffect(() => {
    if (!workloadParam) return;
    const preset = PROCESS_PRESETS.find((item) => item.id === workloadParam);
    if (preset) setProcesses(cloneProcesses(preset.processes));
  }, [workloadParam]);

  useEffect(() => {
    if (quantumParam === undefined) return;
    const value = queryNumber({ quantum: quantumParam }, 'quantum');
    if (value === undefined) return;
    setParameters((previous) => ({ ...previous, quantum: value }));
  }, [quantumParam]);

  const algorithm = getAlgorithm(algorithmId) ?? algorithms[0];
  const lab = getLabForAlgorithm(algorithmId);
  const topic = getTopic(TOPIC_ID);
  const implemented = implementedIds.includes(algorithmId);
  const activeParameters = useMemo(
    () => normaliseParameters(algorithm?.parameters ?? [], parameters),
    [algorithm, parameters],
  );
  const quantum = numericParameter(
    algorithm?.parameters ?? [],
    activeParameters,
    'quantum',
    DEFAULT_QUANTUM,
  );

  const validation = useMemo(() => {
    if (!implemented) return { valid: true } as const;
    return validateSchedulingInput(algorithmId, { processes, quantum });
  }, [algorithmId, implemented, processes, quantum]);

  const run = useMemo(() => {
    if (!implemented || !validation.valid) return null;
    return runSchedulingAlgorithm(algorithmId, { processes, quantum });
  }, [algorithmId, implemented, processes, quantum, validation]);

  const fallbackState = useMemo(emptyState, []);
  const simulation = useSimulation<ScheduleStepData>({ initialState: run?.state ?? fallbackState });
  const { load } = simulation;

  useEffect(() => {
    if (run) load(run.state);
  }, [run, load]);

  const ordered = useMemo(() => orderByArrival(processes), [processes]);
  const colours = useMemo(() => buildColourMap(ordered), [ordered]);
  const colorFor = useMemo(() => makeColourLookup(colours), [colours]);
  const rows = useMemo(() => processRows(ordered), [ordered]);

  const step = simulation.step;
  const data = step?.data;
  const metrics = data?.metrics ?? computeMetrics({ timeline: [], results: [] });
  const timeline = data?.timeline ?? [];
  const results = data?.results ?? [];
  const stepMetrics = step?.metrics ?? {};

  // Round Robin records its dispatch count as `slices` on each step, while the
  // shared summary calls it `timeSlices`; accept either name here.
  const sliceCount = stepMetrics.timeSlices ?? stepMetrics.slices;
  const extras: ScheduleExtras = {
    ...(typeof sliceCount === 'number' ? { timeSlices: sliceCount } : {}),
    ...(typeof stepMetrics.contextSwitches === 'number'
      ? { contextSwitches: stepMetrics.contextSwitches }
      : {}),
    ...(typeof stepMetrics.quantum === 'number' ? { quantum: stepMetrics.quantum } : {}),
  };

  const span = scheduleSpan(run?.summary.makespan ?? 0, processes);

  const resetLab = useCallback(() => {
    setProcesses(cloneProcesses(FCFS_PRESET));
    setParameters({});
    simulation.reset();
  }, [simulation]);

  const loadExample = useCallback(
    (example: EducationalExample<unknown>) => {
      if (!isProcessInput(example.input)) return;
      setProcesses(cloneProcesses(example.input.processes));
    },
    [],
  );

  if (!lab || !algorithm || !topic) {
    return null;
  }

  const concept = conceptFor(algorithm);
  const stepCount = simulation.state.steps.length;
  const currentIndex = simulation.state.currentStepIndex;
  const simulating = viewMode === 'simulate';
  const comparing = viewMode === 'compare';
  const challenging = viewMode === 'challenge';

  const viewToggle = (
    <div className="view-switch" role="group" aria-label="Scheduling view">
      <Button
        size="sm"
        variant={simulating ? 'primary' : 'ghost'}
        aria-pressed={simulating}
        onClick={() => setViewMode('simulate')}
      >
        Single algorithm
      </Button>
      <Button
        size="sm"
        variant={comparing ? 'primary' : 'ghost'}
        aria-pressed={comparing}
        onClick={() => setViewMode('compare')}
      >
        Compare all six
      </Button>
      <Button
        size="sm"
        variant={challenging ? 'primary' : 'ghost'}
        aria-pressed={challenging}
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
        <ConceptBlock
          paragraphs={concept.paragraphs}
          keyPoints={concept.keyPoints}
          title={`${algorithm.name} — the concept`}
        />
      }
      algorithmSelector={
        <AlgorithmSelector
          algorithms={algorithms}
          selectedId={algorithmId}
          onSelect={setAlgorithmId}
          implementedIds={implementedIds}
        />
      }
      parameterPanel={
        <ParameterPanel
          parameters={algorithm.parameters}
          values={activeParameters}
          onChange={(parameterId, value) =>
            setParameters((previous) => ({ ...previous, [parameterId]: value }))
          }
          disabled={!implemented}
        />
      }
      codePanel={
        <CodePanel
          title="Pseudocode"
          caption={`${algorithm.name} — the policy, step by step.`}
          {...(algorithm.pseudocode ? { code: algorithm.pseudocode } : {})}
        />
      }
      selectedExampleId={null}
      onSelectExample={loadExample}
      workload={
        challenging ? undefined : (
        <>
          {!validation.valid ? (
            <Callout tone="warning" title="Fix the workload to run the simulation">
              <p>{describeIssues(validation)}</p>
            </Callout>
          ) : null}
          <Card aria-labelledby="workload-heading">
            <h4 className="panel__title" id="workload-heading">
              Workload
            </h4>
            <ProcessEditor processes={processes} colorFor={colorFor} onChange={setProcesses} />
          </Card>
        </>
        )
      }
      controls={
        <>
          {viewToggle}
          {simulating ? (
            <SimulationControls
              status={simulation.state.status}
              stepIndex={currentIndex}
              stepCount={stepCount}
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
        challenging ? (
          <ChallengePanel colorFor={colorFor} />
        ) : comparing ? (
          <AlgorithmComparison
            processes={processes}
            quantum={quantum}
            colorFor={colorFor}
            algorithms={algorithms}
          />
        ) : (
          <ScheduleBoard
            title={`${algorithm.name} schedule`}
            timeline={timeline}
            span={span}
            colorFor={colorFor}
            runningProcessId={data?.runningProcessId ?? null}
            readyQueue={data?.readyQueue ?? []}
            {...(algorithmId === 'round-robin' ? { note: `quantum ${quantum}` } : {})}
          />
        )
      }
      metricsPanel={
        simulating ? <MetricsPanel metrics={scheduleMetricItems(metrics, extras)} /> : undefined
      }
      timeline={
        simulating ? (
          <Timeline
            entries={timelineEntries(simulation.state.steps)}
            currentIndex={currentIndex}
            onSelect={simulation.goToStep}
          />
        ) : undefined
      }
      eventLog={
        simulating ? (
          <EventLog
            entries={logEntries(simulation.state.steps)}
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
          facts={[
            { term: 'Clock', value: `t = ${step?.clock ?? 0}` },
            { term: 'On the CPU', value: processName(ordered, data?.runningProcessId ?? null) },
            { term: 'Completed', value: `${results.length} / ${processes.length}` },
          ]}
        />
        ) : undefined
      }
      results={
        simulating ? (
        <Card aria-labelledby="results-heading">
          <div className="panel__header">
            <h4 className="panel__title" id="results-heading">
              Per-process results
            </h4>
            <ExportResults
              run={run}
              processes={processes}
              {...(algorithmId === 'round-robin' ? { quantum } : {})}
              algorithmName={algorithm.name}
            />
          </div>
          <ProcessTable
            results={results}
            colorFor={colorFor}
            highlight={data?.runningProcessId ?? null}
            rows={rows}
          />
          <dl className="formula-list">
            <div>
              <dt>Turnaround time</dt>
              <dd>completion − arrival</dd>
            </div>
            <div>
              <dt>Waiting time</dt>
              <dd>turnaround − burst</dd>
            </div>
            <div>
              <dt>Response time</dt>
              <dd>first dispatch − arrival</dd>
            </div>
            <div>
              <dt>Total waiting</dt>
              <dd>{formatNumber(metrics.totalWaitingTime, 2)} units</dd>
            </div>
            <div>
              <dt>Idle share</dt>
              <dd>{formatPercent(metrics.idleTime / Math.max(1, metrics.makespan), 0)} of the run</dd>
            </div>
          </dl>
        </Card>
        ) : undefined
      }
      children={
        simulating ? (
          <DecisionHistory
            entries={decisionEntries(simulation.state.steps)}
            currentIndex={currentIndex}
            onSelect={simulation.goToStep}
          />
        ) : null
      }
      onResetLab={resetLab}
      resetLabel="Reset lab"
      unavailable={!implemented}
      unavailableReason={`${algorithm.name} has no simulator yet. Its objectives, worked examples and pseudocode are ready, and it will run in this same shell once its engine lands.`}
      unavailableAvailable={[
        'The full concept explanation and key points above',
        'The algorithm catalogue entry with its complexity and policy properties',
        'Worked examples you can solve on paper',
      ]}
    />
  );
}
