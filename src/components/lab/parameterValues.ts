import type { AlgorithmParameter, ParameterValue } from '@/types';

/**
 * Pure helpers behind `ParameterPanel`.
 *
 * Kept free of React so parameter handling can be unit tested directly — it is
 * the part most likely to go wrong when a new algorithm declares new knobs.
 */

/** Build the starting value map for a set of parameters. */
export function defaultParameterValues(
  parameters: readonly AlgorithmParameter[],
): Record<string, ParameterValue> {
  const values: Record<string, ParameterValue> = {};
  for (const parameter of parameters) {
    values[parameter.id] = parameter.defaultValue;
  }
  return values;
}

/** Clamp a number to the parameter's declared bounds. */
export function clampParameter(parameter: AlgorithmParameter, value: number): number {
  if (!Number.isFinite(value)) {
    return typeof parameter.defaultValue === 'number' ? parameter.defaultValue : 0;
  }
  const lower = parameter.min ?? Number.NEGATIVE_INFINITY;
  const upper = parameter.max ?? Number.POSITIVE_INFINITY;
  const step = parameter.step ?? 1;
  const stepped = step > 0 ? Math.round(value / step) * step : value;
  const clamped = Math.min(Math.max(stepped, lower), upper);
  // Avoid floating point dust such as 0.30000000000000004.
  return Number(clamped.toFixed(6));
}

/** Coerce raw form input into a valid value for the parameter. */
export function coerceParameterValue(
  parameter: AlgorithmParameter,
  raw: string | boolean,
): ParameterValue {
  switch (parameter.kind) {
    case 'boolean':
      return typeof raw === 'boolean' ? raw : raw === 'true';
    case 'select': {
      const candidate = String(raw);
      const options = parameter.options ?? [];
      return options.some((option) => option.value === candidate)
        ? candidate
        : parameter.defaultValue;
    }
    case 'number':
    default:
      return clampParameter(parameter, typeof raw === 'number' ? raw : Number(raw));
  }
}

/**
 * Merge stored values with the parameter declarations: unknown keys are dropped
 * and missing keys are filled with defaults, so stale state can never leak into
 * a simulation run.
 */
export function normaliseParameters(
  parameters: readonly AlgorithmParameter[],
  values: Readonly<Record<string, ParameterValue>>,
): Record<string, ParameterValue> {
  const normalised: Record<string, ParameterValue> = {};
  for (const parameter of parameters) {
    const stored = values[parameter.id];
    if (stored === undefined) {
      normalised[parameter.id] = parameter.defaultValue;
      continue;
    }
    if (parameter.kind === 'number') {
      normalised[parameter.id] =
        typeof stored === 'number' ? clampParameter(parameter, stored) : parameter.defaultValue;
      continue;
    }
    normalised[parameter.id] = coerceParameterValue(
      parameter,
      typeof stored === 'boolean' ? stored : String(stored),
    );
  }
  return normalised;
}

/** Read a numeric parameter value, falling back to its declared default. */
export function numericParameter(
  parameters: readonly AlgorithmParameter[],
  values: Readonly<Record<string, ParameterValue>>,
  parameterId: string,
  fallback: number,
): number {
  const parameter = parameters.find((item) => item.id === parameterId);
  const stored = values[parameterId];
  if (parameter && typeof stored === 'number') return clampParameter(parameter, stored);
  if (parameter && typeof parameter.defaultValue === 'number') return parameter.defaultValue;
  return fallback;
}
