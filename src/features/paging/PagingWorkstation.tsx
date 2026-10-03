import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EducationalExample } from '@/types';
import {
  PAGING_ALGORITHM_ID,
  createSimulationState,
  describeIssues,
  pagingEngine,
  validatePagingInput,
  type PagingInput,
  type PagingStepData,
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
import { PAGING_CONCEPT } from './concepts';
import { pagingEventLabel, pagingLogEntries, pagingMetricItems, pagingTimelineEntries } from './pagingPresentation';
import { PAGING_LAB_ID, PAGING_TOPIC_ID, pagingInput, pagingPresetOptions } from './pagingRunners';
import { draftFromInput, draftFromPreset, type PagingDraft } from './drafts';
import { AddressFlow } from './components/AddressFlow';
import { PageTableView } from './components/PageTableView';
import { TlbView } from './components/TlbView';
import { FrameView } from './components/FrameView';
import { PagingEditor } from './components/PagingEditor';
import { PagingChallengePanel } from './components/PagingChallengePanel';

function isPagingInput(input: unknown): input is PagingInput {
  if (!input || typeof input !== 'object') return false;
  const candidate = input as Partial<PagingInput>;
  return Array.isArray(candidate.references) && typeof candidate.pageSize === 'number';
}

/**
 * The paging lab.
 *
 * **Simulate** configures the geometry (page size, address widths, TLB) and an
 * address stream, then walks every address through the translation pipeline: split
 * into page number and offset, TLB lookup, page-table walk, optional page fault,
 * and finally a physical address. **Challenge** turns the same engine into marked
 * questions. The engine is pure, so every panel is a function of its steps.
 */
export function PagingWorkstation() {
  const query = useHashQuery();
  const presets = useMemo(() => pagingPresetOptions(), []);
  const fallback = useMemo(
    () => createSimulationState<PagingStepData>({ labId: PAGING_LAB_ID, algorithmId: PAGING_ALGORITHM_ID, steps: [] }),
    [],
  );

  const [draft, setDraft] = useState<PagingDraft>(() => {
    const preset = presets.find((item) => item.id === query.preset) ?? presets[0]!;
    return draftFromPreset(preset);
  });
  const [viewMode, setViewMode] = useState<'simulate' | 'challenge'>('simulate');

  useEffect(() => {
    if (!query.preset) return;
    const preset = presets.find((item) => item.id === query.preset);
    if (preset) setDraft(draftFromPreset(preset));
  }, [presets, query.preset]);

  const input = useMemo<PagingInput>(() => pagingInput(draft), [draft]);
  const validation = useMemo(() => validatePagingInput(input), [input]);
  const run = useMemo(() => (validation.valid ? pagingEngine.run(input) : null), [input, validation]);

  const simulation = useSimulation<PagingStepData>({
    initialState: run?.state ?? fallback,
    baseStepMs: 800,
  });
  const { load } = simulation;

  useEffect(() => {
    if (run) load(run.state);
  }, [run, load]);

  const lab = getLab(PAGING_LAB_ID);
  const algorithm = getAlgorithm(PAGING_ALGORITHM_ID);
  const topic = getTopic(PAGING_TOPIC_ID);

  const loadExample = useCallback((example: EducationalExample<unknown>) => {
    if (!isPagingInput(example.input)) return;
    setDraft(draftFromInput(example.input));
  }, []);

  const resetLab = useCallback(() => {
    setDraft(draftFromPreset(presets[0]!));
    simulation.reset();
  }, [presets, simulation]);

  if (!lab) return null;

  const currentIndex = simulation.state.currentStepIndex;
  const step = simulation.step;
  const data = step?.data;
  const simulating = viewMode === 'simulate';

  const viewToggle = (
    <div className="view-switch" role="group" aria-label="Paging view">
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
      topicLabel={topic?.title ?? 'Virtual Memory'}
      concept={
        <ConceptBlock
          paragraphs={PAGING_CONCEPT.paragraphs}
          keyPoints={PAGING_CONCEPT.keyPoints}
          title={PAGING_CONCEPT.title}
        />
      }
      codePanel={
        algorithm ? (
          <CodePanel
            title="Pseudocode"
            caption={`${algorithm.name} — the translation path.`}
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
              <Callout tone="warning" title="Fix the geometry to run the translation">
                <p>{describeIssues(validation)}</p>
              </Callout>
            ) : null}
            <Card aria-labelledby="paging-editor-heading">
              <h4 className="panel__title" id="paging-editor-heading">
                Configure paging
              </h4>
              <PagingEditor
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
        !simulating ? (
          <PagingChallengePanel />
        ) : data ? (
          <div className="paging-visual">
            <AddressFlow data={data} />
            <div className="paging-visual__side">
              <TlbView data={data} capacity={draft.tlbSize} />
              <FrameView data={data} />
              <PageTableView data={data} />
            </div>
          </div>
        ) : null
      }
      metricsPanel={simulating && data ? <MetricsPanel metrics={pagingMetricItems(data)} /> : undefined}
      timeline={
        simulating ? (
          <Timeline
            entries={pagingTimelineEntries(simulation.state.steps)}
            currentIndex={currentIndex}
            onSelect={simulation.goToStep}
          />
        ) : undefined
      }
      eventLog={
        simulating ? (
          <EventLog
            entries={pagingLogEntries(simulation.state.steps)}
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
                    { term: 'Step', value: pagingEventLabel(data.event) },
                    { term: 'Page', value: `${data.pageNumber}` },
                    { term: 'Offset', value: `${data.offset}` },
                    { term: 'Frame', value: data.frameNumber === null ? '—' : `${data.frameNumber}` },
                  ]
                : []
            }
          />
        ) : undefined
      }
      results={
        simulating ? (
          <Card aria-labelledby="paging-rules-heading">
            <h4 className="panel__title" id="paging-rules-heading">
              The rules
            </h4>
            <dl className="formula-list">
              <div>
                <dt>Offset bits</dt>
                <dd>log₂(page size)</dd>
              </div>
              <div>
                <dt>Page number</dt>
                <dd>logical address ÷ page size</dd>
              </div>
              <div>
                <dt>Physical address</dt>
                <dd>frame × page size + offset</dd>
              </div>
              <div>
                <dt>TLB hit rate</dt>
                <dd>hits ÷ (hits + misses)</dd>
              </div>
              <div>
                <dt>Page fault</dt>
                <dd>valid bit clear — OS loads the page in</dd>
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
