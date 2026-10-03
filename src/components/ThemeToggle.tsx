import type { ThemePreference } from '@/types';
import { useTheme } from '@/hooks';
import { cn } from '@/utils';

interface ThemeOption {
  readonly value: ThemePreference;
  readonly label: string;
  readonly glyph: string;
}

const OPTIONS: readonly ThemeOption[] = [
  { value: 'light', label: 'Light theme', glyph: '☀️' },
  { value: 'dark', label: 'Dark theme', glyph: '🌙' },
  { value: 'system', label: 'Match system theme', glyph: '🖥️' },
];

/**
 * Three-way theme switcher built on native radio inputs: arrow keys move
 * between options for free, and the checked option is exposed to screen readers.
 */
export function ThemeToggle({ className }: { readonly className?: string }) {
  const { preference, setPreference } = useTheme();
  const groupName = 'osvl-theme';

  return (
    <fieldset className={cn('theme-toggle', className)}>
      <legend className="sr-only">Colour theme</legend>
      {OPTIONS.map((option) => (
        <label
          key={option.value}
          className={cn(
            'theme-toggle__option',
            preference === option.value && 'theme-toggle__option--active',
          )}
          title={option.label}
        >
          <input
            className="theme-toggle__input"
            type="radio"
            name={groupName}
            value={option.value}
            checked={preference === option.value}
            onChange={() => setPreference(option.value)}
          />
          <span aria-hidden="true">{option.glyph}</span>
          <span className="sr-only">{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
