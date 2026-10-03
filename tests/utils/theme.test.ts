import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCE,
  THEME_STORAGE_KEY,
  isTheme,
  isThemePreference,
  preferenceLabel,
  readStoredPreference,
  resolveTheme,
  storePreference,
  themeLabel,
  toggleTheme,
  type StorageLike,
} from '@/utils/theme';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  readonly data: Record<string, string>;
} {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe('isTheme / isThemePreference', () => {
  it('narrows valid values only', () => {
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('light')).toBe(true);
    expect(isTheme('system')).toBe(false);
    expect(isThemePreference('system')).toBe(true);
    expect(isThemePreference('sepia')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });
});

describe('readStoredPreference', () => {
  it('reads a stored preference', () => {
    expect(readStoredPreference(memoryStorage({ [THEME_STORAGE_KEY]: 'light' }))).toBe('light');
  });

  it('falls back to system when storage is empty or invalid', () => {
    expect(readStoredPreference(memoryStorage())).toBe(DEFAULT_PREFERENCE);
    expect(readStoredPreference(memoryStorage({ [THEME_STORAGE_KEY]: 'neon' }))).toBe(
      DEFAULT_PREFERENCE,
    );
    expect(readStoredPreference(null)).toBe(DEFAULT_PREFERENCE);
  });
});

describe('storePreference', () => {
  it('persists the value', () => {
    const storage = memoryStorage();
    storePreference(storage, 'dark');
    expect(storage.data[THEME_STORAGE_KEY]).toBe('dark');
  });

  it('is a no-op without storage', () => {
    expect(() => storePreference(undefined, 'dark')).not.toThrow();
  });
});

describe('resolveTheme', () => {
  it('honours an explicit preference regardless of the OS setting', () => {
    expect(resolveTheme('dark', true)).toBe('dark');
    expect(resolveTheme('light', false)).toBe('light');
  });

  it('follows the OS setting for the system preference', () => {
    expect(resolveTheme('system', true)).toBe('light');
    expect(resolveTheme('system', false)).toBe('dark');
  });
});

describe('toggleTheme / labels', () => {
  it('flips between themes', () => {
    expect(toggleTheme('dark')).toBe('light');
    expect(toggleTheme('light')).toBe('dark');
  });

  it('labels themes and preferences', () => {
    expect(themeLabel('dark')).toBe('Dark theme');
    expect(preferenceLabel('system')).toBe('Match system');
    expect(preferenceLabel('light')).toBe('Light');
  });
});
