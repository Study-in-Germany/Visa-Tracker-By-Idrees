"use client";

import { createContext, useContext, useEffect } from "react";

export type PageTitleState = {
  title: string;
  count?: number | null;
  parentLabel?: string;
  parentHref?: string;
} | null;

export type HeaderActionsState = {
  desktop?: React.ReactNode;
  mobile?: React.ReactNode;
} | null;

/** Lets a page put its title (and optional result count / breadcrumb parent) in the top bar. */
export const PageTitleContext = createContext<(state: PageTitleState) => void>(() => {});

/** Lets a page mount contextual actions (e.g. Tracker Filters trigger) inside the global header. */
export const HeaderActionsContext = createContext<(state: HeaderActionsState) => void>(() => {});

export function useSetPageTitle(
  title: string,
  count?: number | null,
  parent?: { label: string; href: string }
) {
  const set = useContext(PageTitleContext);
  const parentLabel = parent?.label;
  const parentHref = parent?.href;
  useEffect(() => {
    set({ title, count, parentLabel, parentHref });
    return () => set(null);
  }, [title, count, parentLabel, parentHref, set]);
}

export function useSetHeaderActions(actions: HeaderActionsState) {
  const set = useContext(HeaderActionsContext);
  useEffect(() => {
    set(actions);
    return () => set(null);
  }, [actions, set]);
}
