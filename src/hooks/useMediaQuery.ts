import { useEffect, useState } from 'react';

const hasMatchMedia = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/** Subscribe to a CSS media query, e.g. `useMediaQuery('(min-width: 900px)')`. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    hasMatchMedia() ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    if (!hasMatchMedia()) return undefined;
    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);

    const onChange = (event: MediaQueryListEvent): void => setMatches(event.matches);
    mediaQueryList.addEventListener('change', onChange);
    return () => mediaQueryList.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
