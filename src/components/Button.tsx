import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { buttonClassName, type ButtonSize, type ButtonVariant } from './buttonStyles';

export type { ButtonSize, ButtonVariant } from './buttonStyles';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  /** Stretch to the width of the container. */
  readonly block?: boolean;
  readonly children: ReactNode;
}

/** Accessible button with the app's variants. Renders a real `<button>`. */
export function Button({
  variant = 'secondary',
  size = 'md',
  block = false,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonClassName({ variant, size, block, className })} {...rest}>
      {children}
    </button>
  );
}
