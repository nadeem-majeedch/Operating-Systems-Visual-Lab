import type { EducationalExample } from '@/types';
import { cn } from '@/utils';

export interface ExampleSelectorProps {
  readonly examples: readonly EducationalExample<unknown>[];
  readonly selectedId?: string | null;
  readonly onSelect: (example: EducationalExample<unknown>) => void;
  /** False when the lab has no simulator to load the example into. */
  readonly enabled?: boolean;
  readonly title?: string;
  readonly emptyMessage?: string;
  readonly disabledMessage?: string;
  readonly className?: string;
}

/**
 * Loads a worked example into the simulator.
 *
 * Examples are only selectable when they carry loadable input *and* the lab can
 * run — otherwise the chip is disabled with the reason spelled out.
 */
export function ExampleSelector({
  examples,
  selectedId = null,
  onSelect,
  enabled = true,
  title = 'Examples',
  emptyMessage = 'No worked examples are authored for this lab yet.',
  disabledMessage = 'Examples can be loaded once the simulator for this lab exists.',
  className,
}: ExampleSelectorProps) {
  return (
    <section className={cn('example-selector', className)} aria-label={title}>
      <h4 className="example-selector__title">{title}</h4>

      {examples.length === 0 ? (
        <p className="example-selector__empty">{emptyMessage}</p>
      ) : !enabled ? (
        <p className="example-selector__empty">{disabledMessage}</p>
      ) : (
        <div className="example-selector__options">
          {examples.map((example) => {
            const loadable = example.input !== undefined;
            const selected = example.id === selectedId;
            return (
              <button
                type="button"
                key={example.id}
                className={cn(
                  'example-chip',
                  selected && 'example-chip--selected',
                  !loadable && 'example-chip--disabled',
                )}
                onClick={() => onSelect(example)}
                disabled={!loadable}
                aria-pressed={selected}
                title={loadable ? example.title : `${example.title} — no loadable input yet`}
              >
                <span className="example-chip__title">{example.title}</span>
                <span className="example-chip__hint">
                  {loadable ? example.expectedOutcome : 'conceptual example'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
