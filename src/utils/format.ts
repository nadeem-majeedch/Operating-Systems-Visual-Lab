import type { ContentStatus, DifficultyLevel } from '@/types';

/** Human-readable labels for domain enums, kept in one place for consistency. */
export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const STATUS_LABELS: Record<ContentStatus, string> = {
  planned: 'Planned',
  beta: 'Beta',
  available: 'Available',
};

/** `42 -> "42"`, `12.5 -> "12.5"`, `12.345 -> "12.35"`. */
export function formatNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Number(value.toFixed(decimals));
  return String(rounded);
}

/** `90 -> "1m 30s"`, `1500 -> "25m"`. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes === 0) return `${rest}s`;
  if (rest === 0) return `${minutes}m`;
  return `${minutes}m ${rest}s`;
}

/** `0.8234 -> "82.3%"`. */
export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(decimals)}%`;
}

/** `"fcfs" -> "Fcfs"`, `"round-robin" -> "Round Robin"`. */
export function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => (word.length === 0 ? word : word[0]!.toUpperCase() + word.slice(1)))
    .join(' ');
}

/** Compact labels for Gantt-chart ticks: `0, 2, 4, ...`. */
export function formatTick(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
