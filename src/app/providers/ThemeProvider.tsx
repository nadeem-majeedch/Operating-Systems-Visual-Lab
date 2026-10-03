import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ThemePreference } from '@/types';
import { ThemeContext, useMediaQuery, type ThemeContextValue } from '@/hooks';
import {
  readStoredPreference,
  resolveTheme,
  storePreference,
  toggleTheme as invertTheme,
  type StorageLike,
} from '@/utils/theme';

function getStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const THEME_COLORS: Record<string, string> = {
  dark: '#0b1020',
  light: '#f5f7fb',
};

/**
 * Owns the active colour scheme.
 *
 * The initial value is applied by the inline script in `index.html` so the first
 * paint is already correct; this provider keeps `data-theme`, the `<meta>`
 * theme colour and `localStorage` in sync afterwards.
 */
export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  const prefersLight = useMediaQuery('(prefers-color-scheme: light)');
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    readStoredPreference(getStorage()),
  );

  const theme = resolveTheme(preference, prefersLight);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[theme] ?? THEME_COLORS.dark ?? '#0b1020');
  }, [theme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    storePreference(getStorage(), next);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreferenceState((current) => {
      const next = invertTheme(resolveTheme(current, prefersLight));
      storePreference(getStorage(), next);
      return next;
    });
  }, [prefersLight]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, preference, setPreference, toggleTheme }),
    [theme, preference, setPreference, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
