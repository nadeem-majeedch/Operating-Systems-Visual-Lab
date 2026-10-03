import { useEffect, useState } from 'react';
import { parseQuery } from '@/utils';

function currentHash(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hash || '';
}

/**
 * Read the query part of the current hash.
 *
 * Used for configuration deep links such as
 * `#/labs/lab-round-robin?quantum=2&workload=convoy`, which keep working on a
 * static host because the query never reaches the server.
 */
export function useHashQuery(): Readonly<Record<string, string>> {
  const [hash, setHash] = useState<string>(currentHash);

  useEffect(() => {
    const onHashChange = (): void => setHash(currentHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return parseQuery(hash);
}

/** Read a query value as a positive integer, ignoring anything malformed. */
export function queryNumber(
  query: Readonly<Record<string, string>>,
  key: string,
): number | undefined {
  const raw = query[key];
  if (raw === undefined || raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}
