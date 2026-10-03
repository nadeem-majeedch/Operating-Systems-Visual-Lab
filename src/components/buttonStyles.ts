import { cn } from '@/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonStyleOptions {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly block?: boolean;
  readonly className?: string;
}

/** Shared class computation so `<button>` and `<a>` can look identical. */
export function buttonClassName({
  variant = 'secondary',
  size = 'md',
  block = false,
  className,
}: ButtonStyleOptions): string {
  return cn('btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', className);
}
