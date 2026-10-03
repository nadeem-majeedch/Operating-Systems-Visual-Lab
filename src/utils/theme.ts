import type { Theme, ThemePreference } from '@/types';

/** Must match the inline bootstrap script in `index.html`. */
export const THEME_STORAGE_KEY = 'osvl.theme';

export const DEFAULT_PREFERENCE: ThemePreference = 'system';

/** Minimal `localStorage` surface so this module stays testable in Node. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/** Read the persisted preference, falling back to `system`. */
export function readStoredPreference(storage: StorageLike | null | undefined): ThemePreference {
  if (!storage) return DEFAULT_PREFERENCE;
  try {
    const raw = storage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : DEFAULT_PREFERENCE;
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

export function storePreference(
  storage: StorageLike | null | undefined,
  preference: ThemePreference,
): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* Storage can be unavailable (private mode, quota) — the theme still applies. */
  }
}

/** Collapse a preference plus the OS setting into a concrete theme. */
export function resolveTheme(preference: ThemePreference, prefersLight: boolean): Theme {
  if (isTheme(preference)) return preference;
  return prefersLight ? 'light' : 'dark';
}

export function toggleTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}

export function themeLabel(theme: Theme): string {
  return theme === 'dark' ? 'Dark theme' : 'Light theme';
}

export function preferenceLabel(preference: ThemePreference): string {
  if (preference === 'system') return 'Match system';
  return preference === 'dark' ? 'Dark' : 'Light';
}
