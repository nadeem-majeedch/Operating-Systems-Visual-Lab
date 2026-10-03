/**
 * Identifier helpers.
 *
 * All ids in the app are plain strings so that content can be authored by hand
 * and remain stable across releases.
 */

let counter = 0;

/** Monotonic, collision-free id for runtime-created entities (steps, processes). */
export function createId(prefix = 'id'): string {
  counter += 1;
  return `${prefix}-${counter.toString(36)}-${Date.now().toString(36)}`;
}

/** Turn arbitrary text into a URL-safe slug. */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Test-only helper: reset the internal counter so ids are deterministic. */
export function resetIdCounterForTests(): void {
  counter = 0;
}
