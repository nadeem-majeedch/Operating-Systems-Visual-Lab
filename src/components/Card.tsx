import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Adds a hover affordance for clickable cards. */
  readonly interactive?: boolean;
  /** Accent colour exposed to CSS as `--card-accent`. */
  readonly accent?: string;
  readonly children: ReactNode;
}

/** Surface container used for topic cards, panels and lab explanations. */
export function Card({
  interactive = false,
  accent,
  className,
  children,
  style,
  ...rest
}: CardProps) {
  const mergedStyle = accent
    ? ({ ...style, '--card-accent': accent } as CSSProperties)
    : style;

  return (
    <article
      className={cn('card', interactive && 'card--interactive', className)}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </article>
  );
}
