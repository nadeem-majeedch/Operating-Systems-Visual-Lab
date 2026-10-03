import { useState } from 'react';
import { Button } from '../Button';
import { cn } from '@/utils';

export interface CodePanelProps {
  readonly code?: string;
  readonly title?: string;
  /** One-line context shown above the listing. */
  readonly caption?: string;
  /** Shown when no listing has been written for this algorithm yet. */
  readonly unavailableMessage?: string;
  readonly className?: string;
}

/** Pseudocode listing with a copy action and a consistent monospace frame. */
export function CodePanel({
  code,
  title = 'Pseudocode',
  caption,
  unavailableMessage = 'A step-by-step listing for this algorithm is being written alongside its simulator.',
  className,
}: CodePanelProps) {
  const [copied, setCopied] = useState(false);

  const copy = (): void => {
    if (!code) return;
    const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
    clipboard
      ?.writeText(code)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setCopied(false));
  };

  return (
    <section className={cn('code-panel', className)} aria-label={title}>
      <header className="code-panel__header">
        <h4 className="code-panel__title">{title}</h4>
        {code ? (
          <Button size="sm" variant="ghost" onClick={copy} aria-label="Copy pseudocode">
            {copied ? 'Copied' : 'Copy'}
          </Button>
        ) : null}
      </header>

      {caption ? <p className="code-panel__caption">{caption}</p> : null}

      {code ? (
        <pre className="code-panel__code" tabIndex={0}>
          <code>{code}</code>
        </pre>
      ) : (
        <p className="code-panel__empty">{unavailableMessage}</p>
      )}
    </section>
  );
}
