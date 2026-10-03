import { useCallback, useRef, useState } from 'react';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface UseLocalStorageResult<T> {
  readonly value: T;
  readonly setValue: (next: T) => void;
  readonly remove: () => void;
}

/** Persist small pieces of UI state (collapsed sections, panel sizes, ...). */
export function useLocalStorage<T>(key: string, initialValue: T): UseLocalStorageResult<T> {
  const initialRef = useRef(initialValue);

  const [value, setStoredValue] = useState<T>(() => {
    const storage = getStorage();
    if (!storage) return initialRef.current;
    try {
      const raw = storage.getItem(key);
      return raw === null ? initialRef.current : (JSON.parse(raw) as T);
    } catch {
      return initialRef.current;
    }
  });

  const setValue = useCallback(
    (next: T) => {
      setStoredValue(next);
      const storage = getStorage();
      if (!storage) return;
      try {
        storage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore quota / privacy-mode errors */
      }
    },
    [key],
  );

  const remove = useCallback((): void => {
    setStoredValue(initialRef.current);
    getStorage()?.removeItem(key);
  }, [key]);

  return { value, setValue, remove };
}
