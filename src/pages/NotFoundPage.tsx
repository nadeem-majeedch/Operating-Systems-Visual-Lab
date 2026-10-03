import { ButtonLink, EmptyState } from '@/components';
import { useDocumentTitle } from '@/hooks';
import { ROUTES, hrefFor } from '@/utils';

export interface NotFoundPageProps {
  readonly title?: string;
  readonly description?: string;
}

/** Fallback for unknown routes and unknown content ids. */
export function NotFoundPage({
  title = 'Page not found',
  description = 'That link does not point at anything in the lab.',
}: NotFoundPageProps) {
  useDocumentTitle(title);

  return (
    <div className="page">
      <EmptyState
        headingLevel={1}
        icon="🧭"
        title={title}
        description={description}
        action={
          <ButtonLink variant="primary" href={hrefFor(ROUTES.home)}>
            Back to the lab
          </ButtonLink>
        }
      />
    </div>
  );
}
