import { useCallback, useMemo, useState } from 'react';

export interface UseDisclosureResult {
  readonly isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/** Minimal open/close state used by the mobile navigation drawer. */
export function useDisclosure(initiallyOpen = false): UseDisclosureResult {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((value) => !value), []);

  // Memoised so consumers can safely depend on the returned object.
  return useMemo(() => ({ isOpen, open, close, toggle }), [isOpen, open, close, toggle]);
}
