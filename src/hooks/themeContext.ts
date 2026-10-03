import { createContext } from 'react';
import type { Theme, ThemePreference } from '@/types';

export interface ThemeContextValue {
  /** The theme currently applied to the document. */
  readonly theme: Theme;
  /** The user's stored preference (`light`, `dark`, or `system`). */
  readonly preference: ThemePreference;
  readonly setPreference: (preference: ThemePreference) => void;
  /** Flip between light and dark, turning an auto preference into an explicit one. */
  readonly toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
