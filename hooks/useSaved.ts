"use client";

import { useCallback, useEffect, useState } from "react";

const LISTINGS_KEY = "vt.saved-listings";

const read = (key: string, max: number): string[] => {
  try { return JSON.parse(localStorage.getItem(key) || "[]").filter((x: unknown) => typeof x === "string").slice(0, max); } catch { return []; }
};

/**
 * A short list of ids kept in this browser (no account needed) and synced across tabs and components.
 * Used for saved places, bookmarked programmes and the programme comparison list.
 */
export function useSaved(key: string = LISTINGS_KEY, max = 50) {
  const event = `vt:changed:${key}`;
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setIds(read(key, max));
    sync();
    const onStorage = (e: StorageEvent) => { if (e.key === key) sync(); };
    window.addEventListener(event, sync);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener(event, sync); window.removeEventListener("storage", onStorage); };
  }, [key, max, event]);

  /** Adds or removes an id. Returns false when the list is full and the id could not be added. */
  const toggle = useCallback((id: string): boolean => {
    const cur = read(key, max);
    if (!cur.includes(id) && cur.length >= max && max < 50) return false;
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur].slice(0, max);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
    window.dispatchEvent(new Event(event));
    return true;
  }, [key, max, event]);

  const clear = useCallback(() => {
    try { localStorage.removeItem(key); } catch {}
    window.dispatchEvent(new Event(event));
  }, [key, event]);

  return { ids, isSaved: (id: string) => ids.includes(id), toggle, clear };
}

export const SAVED_PROGRAMMES_KEY = "vt.saved-programmes";
export const COMPARE_KEY = "vt.compare-programmes";
export const COMPARE_MAX = 3;
