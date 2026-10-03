import { Fragment, type ReactNode } from 'react';
import { cn } from '@/utils';

export interface ConceptBlockProps {
  readonly title?: string;
  readonly paragraphs: readonly string[];
  /** Bullet list of the ideas to take away. */
  readonly keyPoints?: readonly string[];
  /** Extra content, e.g. a formula list or a diagram. */
  readonly children?: ReactNode;
  readonly className?: string;
}

/**
 * Matches the tiny subset of inline formatting the concept copy uses:
 * `**strong**`, `*emphasis*` and `` `code` ``. Kept deliberately small so the
 * content files stay plain, readable strings rather than markup.
 */
const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g;

/** Renders a plain string, turning its inline markers into real elements. */
function renderInline(text: string): ReactNode {
  return text
    .split(INLINE_PATTERN)
    .filter((part) => part !== '')
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index}>{part.slice(1, -1)}</code>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index}>{part.slice(1, -1)}</em>;
      }
      return <Fragment key={index}>{part}</Fragment>;
    });
}

/** The "concept explanation" region every lab opens with. */
export function ConceptBlock({
  title = 'The concept',
  paragraphs,
  keyPoints = [],
  children,
  className,
}: ConceptBlockProps) {
  return (
    <section className={cn('concept-block', className)} aria-label={title}>
      <h4 className="concept-block__title">{title}</h4>
      <div className="concept-block__prose">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{renderInline(paragraph)}</p>
        ))}
      </div>

      {keyPoints.length > 0 ? (
        <>
          <h5 className="concept-block__subtitle">Key points</h5>
          <ul className="check-list">
            {keyPoints.map((point) => (
              <li key={point}>{renderInline(point)}</li>
            ))}
          </ul>
        </>
      ) : null}

      {children}
    </section>
  );
}
