import { useEffect, useState } from 'react';
import type { Route } from '@/utils';
import { isRouteHash, parseRoute } from '@/utils';

const DEFAULT_HASH = '#/';

function currentHash(): string {
  if (typeof window === 'undefined') return DEFAULT_HASH;
  const hash = window.location.hash;
  return isRouteHash(hash) ? hash || DEFAULT_HASH : DEFAULT_HASH;
}

/** Subscribe to `location.hash` and resolve it to a typed `Route`. */
export function useHashRoute(): Route {
  const [hash, setHash] = useState<string>(currentHash);

  useEffect(() => {
    const onHashChange = (): void => {
      const next = window.location.hash;
      // In-page anchors (e.g. the skip link target) must not change the route.
      if (!isRouteHash(next)) return;
      setHash(next || DEFAULT_HASH);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return parseRoute(hash);
}

/** Imperatively move to a path (`navigate('/labs/lab-fcfs')`). */
export function navigate(path: string): void {
  const target = path.startsWith('#') ? path : `#${path.startsWith('/') ? path : `/${path}`}`;
  if (window.location.hash === target) return;
  window.location.hash = target;
}
