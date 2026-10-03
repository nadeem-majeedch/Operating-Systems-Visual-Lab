import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EducationalExample } from '@/types';
import {
  ALLOCATION_LABELS,
  ALLOCATION_ALGORITHM_IDS,
  createSimulationState,
  describeIssues,
  runFileSystem,
  validateFsInput,
  type FsInput,
  type FsStepData,
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
import { FS_CONCEPT } from './concepts';
import {
  fsEventLabel,
  fsLogEntries,
  fsMetricItems,
  fsTimelineEntries,
} from './fsPresentation';
import {
  FS_LAB_ID_VALUE,
  FS_TOPIC_ID,
  algorithmForAlgorithmId,
  fsInput,
  fsPresetOptions,
} from './fsRunners';
import { draftFromInput, draftFromPreset, type FsDraft } from './drafts';
import { DirectoryTree } from './components/DirectoryTree';
import { BlockMap } from './components/BlockMap';
import { FreeSpaceBitmap } from './components/FreeSpaceBitmap';
import { FragmentationPanel } from './components/FragmentationPanel';
import { FragmentationChart } from './components/FragmentationChart';
import { InodeTable } from './components/InodeTable';
import { FsMetadataPanel } from './components/FsMetadataPanel';
import { FsEditor } from './components/FsEditor';
import { FsComparisonPanel } from './components/FsComparisonPanel';
import { FsChallengePanel } from './components/FsChallengePanel';

export interface FsWorkstationProps {
  readonly initialAlgorithmId: string;
}

function isFsInput(input: unknown): input is FsInput {
  if (!input || typeof input !== 'object') return false;
  const candidate = input as Partial<FsInput>;
  return typeof candidate.allocation === 'string' && Array.isArray(candidate.operations);
}

/**
 * The file-system lab.
 *
 * **Simulate** builds a volume (blocks, block size, inode table), chooses an
 * allocation strategy and replays a script of real operations — mkdir, create,
 * delete, rename, move, open, close, chmod — showing the directory tree, the
 * block map, the free-space bitmap, the inode table and the metadata of the file
 * each step touched. **Compare** runs the same script under all three
 * strategies. **Challenge** turns the engine into marked questions.
 */
export function FsWorkstation({ initialAlgorithmId }: FsWorkstationProps) {
  const query = useHashQuery();
  const presets = useMemo(() => fsPresetOptions(), []);
  const initialAllocation = algorithmForAlgorithmId(initialAlgorithmId) ?? 'contiguous';

  const fallback = useMemo(
    () =>
      createSimulationState<FsStepData>({
        labId: FS_LAB_ID_VALUE,
        algorithmId: ALLOCATION_ALGORITHM_IDS[initialAllocation],
        steps: [],
      }),
    [initialAllocation],
  );

  const [draft, setDraft] = useState<FsDraft>(() => {
    const preset = presets.find((item) => item.id === query.preset) ?? presets[0]!;
    const base = draftFromPreset(preset);
    return preset.id === presets[0]!.id ? { ...base, allocation: initialAllocation } : base;
  });
  const [viewMode, setViewMode] = useState<'simulate' | 'compare' | 'challenge'>('simulate');

  useEffect(() => {
    if (!query.preset) return;
    const preset = presets.find((item) => item.id === query.preset);
    if (preset) setDraft(draftFromPreset(preset));
  }, [presets, query.preset]);

  const input = useMemo<FsInput>(() => fsInput(draft), [draft]);
  const validation = useMemo(() => validateFsInput(input), [input]);
  const run = useMemo(() => (validation.valid ? runFileSystem(input) : null), [input, validation]);

  const simulation = useSimulation<FsStepData>({
    initialState: run?.state ?? fallback,
    baseStepMs: 750,
  });
  const { load } = simulation;

  useEffect(() => {
    if (run) load(run.state);
  }, [run, load]);

  const lab = getLab(FS_LAB_ID_VALUE);
  const topic = getTopic(FS_TOPIC_ID);
  const algorithm = getAlgorithm(ALLOCATION_ALGORITHM_IDS[draft.allocation]);

  const loadExample = useCallback((example: EducationalExample<unknown>) => {
    if (!isFsInput(example.input)) return;
    setDraft(draftFromInput(example.input));
  }, []);

  const resetLab = useCallback(() => {
    setDraft({ ...draftFromPreset(presets[0]!), allocation: initialAllocation });
    simulation.reset();
  }, [presets, simulation, initialAllocation]);

  if (!lab) return null;

  const currentIndex = simulation.state.currentStepIndex;
  const step = simulation.step;
  const data = step?.data;
  const simulating = viewMode === 'simulate';
  const comparing = viewMode === 'compare';

  const viewToggle = (
    <div className="view-switch" role="group" aria-label="File system view">
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
      topicLabel={topic?.title ?? 'File Systems'}
      concept={
        <ConceptBlock
          paragraphs={FS_CONCEPT.paragraphs}
          keyPoints={FS_CONCEPT.keyPoints}
          title={FS_CONCEPT.title}
        />
      }
      codePanel={
        algorithm ? (
          <CodePanel
            title="Pseudocode"
            caption={`${algorithm.name} — block allocation.`}
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
              <Callout tone="warning" title="Fix the volume to run the simulation">
                <p>{describeIssues(validation)}</p>
              </Callout>
            ) : null}
            <Card aria-labelledby="fs-editor-heading">
              <h4 className="panel__title" id="fs-editor-heading">
                Build the volume and operations
              </h4>
              <FsEditor
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
          <FsChallengePanel />
        ) : comparing ? (
          <FsComparisonPanel
            blockCount={draft.blockCount}
            blockSize={draft.blockSize}
            inodeCount={draft.inodeCount}
            operations={draft.operations}
          />
        ) : data ? (
          <div className="fs-visual">
            <div className="fs-visual__row">
              <DirectoryTree data={data} />
              <FsMetadataPanel data={data} />
            </div>
            <BlockMap data={data} />
            <div className="fs-visual__row">
              <FreeSpaceBitmap data={data} />
              <FragmentationPanel data={data} />
            </div>
            <FragmentationChart steps={simulation.state.steps} currentIndex={currentIndex} />
            <InodeTable data={data} />
          </div>
        ) : null
      }
      metricsPanel={simulating && data ? <MetricsPanel metrics={fsMetricItems(data)} /> : undefined}
      timeline={
        simulating ? (
          <Timeline
            entries={fsTimelineEntries(simulation.state.steps)}
            currentIndex={currentIndex}
            onSelect={simulation.goToStep}
          />
        ) : undefined
      }
      eventLog={
        simulating ? (
          <EventLog
            entries={fsLogEntries(simulation.state.steps)}
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
                    { term: 'Operation', value: data.operation },
                    { term: 'Result', value: data.success === false ? 'refused' : 'completed' },
                    { term: 'Event', value: fsEventLabel(data.event) },
                    { term: 'Strategy', value: ALLOCATION_LABELS[data.allocation] },
                    { term: 'Active file', value: data.activePath ?? '—' },
                    {
                      term: 'Blocks',
                      value: `${data.usedBlocks} used · ${data.freeBlocks} free`,
                    },
                    ...(data.reason ? [{ term: 'Reason', value: data.reason }] : []),
                  ]
                : []
            }
          />
        ) : undefined
      }
      results={
        simulating ? (
          <Card aria-labelledby="fs-rules-heading">
            <h4 className="panel__title" id="fs-rules-heading">
              The rules
            </h4>
            <dl className="formula-list">
              <div>
                <dt>Directory entry</dt>
                <dd>maps a name to an inode number</dd>
              </div>
              <div>
                <dt>Inode</dt>
                <dd>size, permissions, timestamps and block pointers</dd>
              </div>
              <div>
                <dt>Contiguous</dt>
                <dd>one run of blocks — fast reads, external fragmentation</dd>
              </div>
              <div>
                <dt>Linked</dt>
                <dd>next-block pointer in each block — no fragmentation, linear reads</dd>
              </div>
              <div>
                <dt>Indexed</dt>
                <dd>pointers in the inode; one index block past the direct pointers</dd>
              </div>
              <div>
                <dt>Free-space bitmap</dt>
                <dd>one bit per block; 1 means used</dd>
              </div>
              <div>
                <dt>Permissions</dt>
                <dd>three bits per class, octal 000–777</dd>
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
              Each strategy replays the identical operation script over an identical volume. Only
              contiguous allocation can fail while free blocks remain — that failure is external
              fragmentation, and it disappears the moment a neighbouring file is deleted.
            </p>
          </Callout>
        ) : undefined
      }
    />
  );
}
