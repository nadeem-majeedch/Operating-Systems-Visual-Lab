import { useEffect } from 'react';

export const APP_NAME = 'Operating Systems Visual Lab';

/** Keep `document.title` in sync with the active page. */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
