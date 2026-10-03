import type { ReactNode } from 'react';
import type { EducationalExample, Lab } from '@/types';
import { formatDuration } from '@/utils';
import { Button } from '../Button';
import { ComingSoonPanel } from './ComingSoonPanel';
import { DifficultyMeter } from './DifficultyMeter';
import { ExampleSelector } from './ExampleSelector';
import { StatusBadge } from './StatusBadge';

export interface LabShellProps {
  /** The lab's authored content: title, objectives, difficulty, status, examples. */
  readonly lab: Lab;
  /** Owning topic title, shown as the eyebrow. */
  readonly topicLabel: string;

  /** Concept explanation — usually a `<ConceptBlock>`. */
  readonly concept: ReactNode;

  /** Algorithm picker, parameter form and pseudocode for the aside column. */
  readonly algorithmSelector?: ReactNode;
  readonly parameterPanel?: ReactNode;
  readonly codePanel?: ReactNode;

  /** Example selector wiring; omit to hide the selector. */
  readonly selectedExampleId?: string | null;
  readonly onSelectExample?: (example: EducationalExample<unknown>) => void;

  /** Input editor for the lab's own workload. */
  readonly workload?: ReactNode;

  /** Simulator regions. `visualization` is unused when `unavailable` is set. */
  readonly controls?: ReactNode;
  readonly visualization?: ReactNode;
  readonly metricsPanel?: ReactNode;
  readonly timeline?: ReactNode;
  readonly eventLog?: ReactNode;
  readonly explanationPanel?: ReactNode;
  readonly results?: ReactNode;

  /** Resets the lab's inputs back to their defaults. */
  readonly onResetLab?: () => void;
  readonly resetLabel?: string;

  /** Render the "coming in next module" state instead of a simulator. */
  readonly unavailable?: boolean;
  readonly unavailableReason?: string;
  readonly unavailableAvailable?: readonly string[];

  /** Anything else the lab wants below the fold. */
  readonly children?: ReactNode;
}

/**
 * The single layout every lab uses.
 *
 * Because the shell owns the structure and the visual language, a lab only has
 * to supply its inputs and its visualisation. Labs whose simulator does not
 * exist yet use the same shell with `unavailable` set, so the curriculum looks
 * consistent while never faking a simulation.
 */
export function LabShell({
  lab,
  topicLabel,
  concept,
  algorithmSelector,
  parameterPanel,
  codePanel,
  selectedExampleId = null,
  onSelectExample,
  workload,
  controls,
  visualization,
  metricsPanel,
  timeline,
  eventLog,
  explanationPanel,
  results,
  onResetLab,
  resetLabel = 'Reset lab',
  unavailable = false,
  unavailableReason,
  unavailableAvailable,
  children,
}: LabShellProps) {
  const [primaryObjective, ...otherObjectives] = lab.objectives;

  return (
    <article className="lab-shell">
      <header className="lab-shell__header">
        <p className="page-header__eyebrow">{topicLabel} · Lab</p>

        <div className="lab-shell__title-row">
          <h1 className="page-header__title">{lab.title}</h1>
          <StatusBadge status={unavailable ? 'planned' : lab.status} />
        </div>

        <p className="page-header__lead">{lab.summary}</p>

        <div className="lab-shell__meta">
          <DifficultyMeter difficulty={lab.difficulty} />
          <span className="lab-shell__minutes">≈ {formatDuration(lab.estimatedMinutes * 60)}</span>
          {onResetLab ? (
            <Button variant="ghost" size="sm" onClick={onResetLab}>
              {resetLabel}
            </Button>
          ) : null}
        </div>
      </header>

      <div className="lab-shell__intro">
        <section className="objective-block" aria-label="Learning objective">
          <h4 className="objective-block__title">Learning objective</h4>
          {primaryObjective ? <p className="objective-block__primary">{primaryObjective}</p> : null}
          {otherObjectives.length > 0 ? (
            <ul className="check-list">
              {otherObjectives.map((objective) => (
                <li key={objective}>{objective}</li>
              ))}
            </ul>
          ) : null}
        </section>

        {concept}
      </div>

      {onSelectExample && lab.examples.length > 0 ? (
        <ExampleSelector
          examples={lab.examples}
          selectedId={selectedExampleId}
          onSelect={onSelectExample}
          enabled={!unavailable}
        />
      ) : null}

      <div className="lab-shell__grid">
        <aside className="lab-shell__aside" aria-label="Simulation setup">
          {algorithmSelector}
          {parameterPanel}
          {codePanel}
        </aside>

        <div className="lab-shell__stage">
          {unavailable ? (
            <ComingSoonPanel
              reason={unavailableReason ?? 'The simulator for this lab has not been built yet.'}
              {...(unavailableAvailable ? { available: unavailableAvailable } : {})}
            />
          ) : (
            <>
              {workload}
              {controls}
              {visualization}
              {metricsPanel}
            </>
          )}
        </div>
      </div>

      {!unavailable && (timeline || eventLog || explanationPanel) ? (
        <div className="lab-shell__trace">
          {timeline}
          <div className="lab-shell__trace-side">
            {explanationPanel}
            {eventLog}
          </div>
        </div>
      ) : null}

      {!unavailable ? results : null}

      {children}
    </article>
  );
}
