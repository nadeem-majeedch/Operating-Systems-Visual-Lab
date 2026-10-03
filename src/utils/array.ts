/** Tiny, allocation-light collection helpers shared by engines and UI. */

/** Inclusive-free numeric range: `range(3) -> [0, 1, 2]`. */
export function range(length: number, start = 0, step = 1): number[] {
  const safeLength = Math.max(0, Math.floor(length));
  const result: number[] = new Array<number>(safeLength);
  for (let i = 0; i < safeLength; i += 1) {
    result[i] = start + i * step;
  }
  return result;
}

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length;
}

export function min(values: readonly number[]): number {
  return values.length === 0 ? 0 : Math.min(...values);
}

export function max(values: readonly number[]): number {
  return values.length === 0 ? 0 : Math.max(...values);
}

/** Round to a fixed number of decimals, avoiding `0.30000000000000004`. */
export function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function clamp(value: number, lower: number, upper: number): number {
  if (lower > upper) throw new RangeError(`clamp: lower (${lower}) > upper (${upper})`);
  return Math.min(Math.max(value, lower), upper);
}

/** Group items into a record keyed by the selector result. */
export function groupBy<T, K extends string>(
  items: readonly T[],
  select: (item: T) => K,
): Record<K, T[]> {
  const groups = {} as Record<K, T[]>;
  for (const item of items) {
    const key = select(item);
    const bucket = groups[key];
    if (bucket) {
      bucket.push(item);
    } else {
      groups[key] = [item];
    }
  }
  return groups;
}

/** Keep the first item for each key, preserving input order. */
export function uniqueBy<T, K extends string | number>(
  items: readonly T[],
  select: (item: T) => K,
): T[] {
  const seen = new Set<K>();
  const result: T[] = [];
  for (const item of items) {
    const key = select(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

/** Case-insensitive "does anything match this query" over multiple fields. */
export function matchesQuery(query: string, fields: readonly (string | undefined)[]): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  return fields.some((field) => (field ?? '').toLowerCase().includes(needle));
}
