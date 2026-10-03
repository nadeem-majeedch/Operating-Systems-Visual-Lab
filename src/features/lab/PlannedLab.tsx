import { useMemo, useState } from 'react';
import type { Lab } from '@/types';
import {
  AlgorithmSelector,
  CodePanel,
  ConceptBlock,
  LabShell,
  ParameterPanel,
  SectionHeading,
  defaultParameterValues,
  normaliseParameters,
} from '@/components';
import { getAlgorithms, getLabForAlgorithm } from '@/content';
import { listImplementedAlgorithmIds } from '@/engine';
import { ROUTES, formatDuration, hrefFor } from '@/utils';
import { ExampleCard } from '../examples/ExampleCard';
import { deriveAlgorithmConcept } from './algorithmConcept';

export interface PlannedLabProps {
  readonly lab: Lab;
  readonly topicLabel: string;
}

/**
 * A lab whose engine has not been written yet.
 *
 * It uses the same shell as the working labs, so the page reads as part of the
 * same product: real objectives, real concepts, real pseudocode, real worked
 * examples — and an explicit statement that the simulator is missing rather than
 * a decorative mock of one.
 */
export function PlannedLab({ lab, topicLabel }: PlannedLabProps) {
  const algorithms = useMemo(() => getAlgorithms(lab.algorithmIds), [lab.algorithmIds]);
  const implementedIds = useMemo(() => listImplementedAlgorithmIds(), []);
  const [selectedId, setSelectedId] = useState<string>(() => lab.algorithmIds[0] ?? '');

  const algorithm = algorithms.find((item) => item.id === selectedId) ?? algorithms[0];

  const [parameters, setParameters] = useState(() => defaultParameterValues(algorithm?.parameters ?? []));
  const activeParameters = normaliseParameters(algorithm?.parameters ?? [], parameters);

  const concept = algorithm ? deriveAlgorithmConcept(algorithm) : { paragraphs: [lab.description], keyPoints: [] };
  const hostingLab = algorithm ? getLabForAlgorithm(algorithm.id) : undefined;
  const hasElsewhere = algorithm !== undefined && implementedIds.includes(algorithm.id) && hostingLab;

  return (
    <LabShell
      lab={lab}
      topicLabel={topicLabel}
      concept={
        <ConceptBlock
          title={algorithm ? `${algorithm.name} — the concept` : 'The concept'}
          paragraphs={concept.paragraphs}
          keyPoints={concept.keyPoints}
        >
          {hasElsewhere && hostingLab ? (
            <p className="concept-block__aside">
              This algorithm already has a working simulator in the{' '}
              <a href={hrefFor(ROUTES.lab(hostingLab.id))}>{hostingLab.title}</a> lab — open it there to
              run the steps.
            </p>
          ) : null}
        </ConceptBlock>
      }
      algorithmSelector={
        <AlgorithmSelector
          algorithms={algorithms}
          selectedId={algorithm?.id ?? ''}
          onSelect={(id) => {
            setSelectedId(id);
            const next = algorithms.find((item) => item.id === id);
            setParameters(defaultParameterValues(next?.parameters ?? []));
          }}
          implementedIds={implementedIds}
        />
      }
      parameterPanel={
        <ParameterPanel
          parameters={algorithm?.parameters ?? []}
          values={activeParameters}
          onChange={(parameterId, value) =>
            setParameters((previous) => ({ ...previous, [parameterId]: value }))
          }
          disabled
        />
      }
      codePanel={
        <CodePanel
          caption={
            algorithm
              ? `${algorithm.name} — the policy, step by step.`
              : 'The algorithm listing for this lab.'
          }
          {...(algorithm?.pseudocode ? { code: algorithm.pseudocode } : {})}
        />
      }
      unavailable
      unavailableReason={
        algorithm
          ? `The ${algorithm.name} simulator is not built yet. Nothing on this page pretends otherwise.`
          : 'The simulator for this lab is not built yet.'
      }
      unavailableAvailable={[
        'Every learning objective for this lab, above',
        'The concept explanation and policy properties of each algorithm listed',
        'Pseudocode for the algorithm, where it has been written',
        'Worked examples with expected outcomes and discussion questions, below',
      ]}
    >
      {lab.examples.length > 0 ? (
        <section className="section" aria-labelledby="lab-examples-heading">
          <SectionHeading
            title="Worked examples"
            id="lab-examples-heading"
            eyebrow="Practice"
            description={`Scenarios to reason through on paper — ${formatDuration(lab.estimatedMinutes * 60)} of guided practice in total.`}
          />
          <div className="example-grid">
            {lab.examples.map((example, index) => (
              <ExampleCard key={example.id} example={example} index={index + 1} />
            ))}
          </div>
        </section>
      ) : null}
    </LabShell>
  );
}
