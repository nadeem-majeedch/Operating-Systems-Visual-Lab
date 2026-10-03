import { useId } from 'react';
import type { Algorithm } from '@/types';
import { cn } from '@/utils';
import { StatusBadge } from './StatusBadge';

export interface AlgorithmSelectorProps {
  readonly algorithms: readonly Algorithm[];
  readonly selectedId: string;
  readonly onSelect: (algorithmId: string) => void;
  /** Algorithm ids that currently have a working simulator. */
  readonly implementedIds: readonly string[];
  readonly title?: string;
  readonly className?: string;
}

/**
 * Chooses which algorithm a lab is working on.
 *
 * Algorithms without an engine can still be selected: doing so swaps the
 * concept explanation, parameters and pseudocode, and the simulator area states
 * plainly that the engine has not landed yet. The badge on each option always
 * reflects reality.
 */
export function AlgorithmSelector({
  algorithms,
  selectedId,
  onSelect,
  implementedIds,
  title = 'Algorithm',
  className,
}: AlgorithmSelectorProps) {
  const groupName = useId();

  return (
    <section className={cn('algorithm-selector', className)} aria-label={title}>
      <h4 className="algorithm-selector__title">{title}</h4>
      <div className="algorithm-selector__options" role="radiogroup" aria-label={title}>
        {algorithms.map((algorithm) => {
          const implemented = implementedIds.includes(algorithm.id);
          const inputId = `${groupName}-${algorithm.id}`;
          const selected = algorithm.id === selectedId;

          return (
            <div
              className={cn(
                'algorithm-option',
                selected && 'algorithm-option--selected',
                !implemented && 'algorithm-option--disabled',
              )}
              key={algorithm.id}
            >
              <input
                className="algorithm-option__input"
                type="radio"
                id={inputId}
                name={groupName}
                value={algorithm.id}
                checked={selected}
                onChange={() => onSelect(algorithm.id)}
              />
              <label className="algorithm-option__label" htmlFor={inputId}>
                <span className="algorithm-option__name">
                  {algorithm.name}
                  {algorithm.abbreviation ? (
                    <span className="algorithm-option__abbr"> ({algorithm.abbreviation})</span>
                  ) : null}
                </span>
                <StatusBadge status={implemented ? 'available' : 'planned'} />
              </label>
              <p className="algorithm-option__summary">{algorithm.summary}</p>
              {!implemented ? (
                <p className="algorithm-option__pending">
                  Concept and pseudocode below; the simulator is coming in a later module.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
