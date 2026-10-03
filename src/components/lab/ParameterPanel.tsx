import type { AlgorithmParameter, ParameterValue } from '@/types';
import { cn } from '@/utils';
import { coerceParameterValue } from './parameterValues';

export interface ParameterPanelProps {
  readonly parameters: readonly AlgorithmParameter[];
  readonly values: Readonly<Record<string, ParameterValue>>;
  readonly onChange: (parameterId: string, value: ParameterValue) => void;
  readonly disabled?: boolean;
  readonly title?: string;
  readonly emptyMessage?: string;
  readonly className?: string;
}

/**
 * Renders whatever knobs an algorithm declares, and nothing else.
 *
 * An algorithm with no tunable parameters says so explicitly rather than
 * showing a dead control, so every control on screen changes the simulation.
 */
export function ParameterPanel({
  parameters,
  values,
  onChange,
  disabled = false,
  title = 'Parameters',
  emptyMessage = 'This algorithm has no tunable parameters — its behaviour is fully determined by the input.',
  className,
}: ParameterPanelProps) {
  return (
    <section className={cn('parameter-panel', className)} aria-label={title}>
      <h4 className="parameter-panel__title">{title}</h4>

      {parameters.length === 0 ? (
        <p className="parameter-panel__empty">{emptyMessage}</p>
      ) : (
        <div className="parameter-panel__fields">
          {parameters.map((parameter) => {
            const value = values[parameter.id] ?? parameter.defaultValue;
            const inputId = `param-${parameter.id}`;
            return (
              <div className="parameter-field" key={parameter.id}>
                <div className="parameter-field__head">
                  <label className="parameter-field__label" htmlFor={inputId}>
                    {parameter.name}
                  </label>
                  <span className="parameter-field__value" aria-hidden="true">
                    {parameter.kind === 'boolean' ? (value ? 'on' : 'off') : String(value)}
                  </span>
                </div>

                {parameter.kind === 'number' ? (
                  <input
                    id={inputId}
                    className="parameter-field__input"
                    type="number"
                    value={typeof value === 'number' ? value : Number(value)}
                    min={parameter.min}
                    max={parameter.max}
                    step={parameter.step ?? 1}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange(parameter.id, coerceParameterValue(parameter, event.target.value))
                    }
                    aria-describedby={`${inputId}-description`}
                  />
                ) : null}

                {parameter.kind === 'boolean' ? (
                  <input
                    id={inputId}
                    className="parameter-field__checkbox"
                    type="checkbox"
                    checked={Boolean(value)}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange(parameter.id, coerceParameterValue(parameter, event.target.checked))
                    }
                    aria-describedby={`${inputId}-description`}
                  />
                ) : null}

                {parameter.kind === 'select' ? (
                  <select
                    id={inputId}
                    className="parameter-field__select"
                    value={String(value)}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange(parameter.id, coerceParameterValue(parameter, event.target.value))
                    }
                    aria-describedby={`${inputId}-description`}
                  >
                    {(parameter.options ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}

                <p className="parameter-field__description" id={`${inputId}-description`}>
                  {parameter.description}
                  {parameter.min !== undefined && parameter.max !== undefined ? (
                    <>
                      {' '}
                      <span className="parameter-field__bounds">
                        ({parameter.min}–{parameter.max})
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
