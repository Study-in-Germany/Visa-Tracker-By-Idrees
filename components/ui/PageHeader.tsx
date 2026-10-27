"use client";

import { useSetPageTitle } from "@/components/PageTitle";

/**
 * The page title lives in the top bar (see AppShell), so this registers it there and only renders what belongs
 * in the page itself: an optional description and action buttons. Renders nothing when there are neither.
 */
export default function PageHeader({ title, count, description, actions }: { title: string; /** Shown as a small pill beside the title in the top bar, e.g. the number of results. */ count?: number | null; description?: string; actions?: React.ReactNode; eyebrow?: string }) {
  useSetPageTitle(title, count);
  if (!description && !actions) return null;
  return (
    <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      {description ? <p className="max-w-2xl text-[13px] text-mute">{description}</p> : <span />}
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
