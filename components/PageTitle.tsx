"use client";

import { createContext, useContext, useEffect } from "react";

export type PageTitleState = { title: string; count?: number | null } | null;

/** Lets a page put its title (and an optional result count) in the top bar. AppShell provides the setter; without it this does nothing. */
export const PageTitleContext = createContext<(state: PageTitleState) => void>(() => {});

export function useSetPageTitle(title: string, count?: number | null) {
  const set = useContext(PageTitleContext);
  useEffect(() => {
    set({ title, count });
    return () => set(null);
  }, [title, count, set]);
}
