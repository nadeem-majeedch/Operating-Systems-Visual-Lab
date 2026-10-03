import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { buttonClassName, type ButtonSize, type ButtonVariant } from './buttonStyles';

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly block?: boolean;
  readonly children: ReactNode;
}

/**
 * A real anchor styled as a button.
 *
 * Navigation must stay a link (middle-click, "open in new tab", screen-reader
 * link lists), so this deliberately renders `<a>` rather than `<button>`.
 */
export function ButtonLink({
  variant = 'secondary',
  size = 'md',
  block = false,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <a className={buttonClassName({ variant, size, block, className })} {...rest}>
      {children}
    </a>
  );
}
