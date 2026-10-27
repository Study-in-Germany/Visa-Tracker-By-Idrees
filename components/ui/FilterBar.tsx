"use client";

import Icon from "./Icon";
import Modal from "./Modal";

export type ActiveFilter = { id: string; label: string; onRemove: () => void };

/** The "Filters" button. Place it anywhere (e.g. in a toolbar row); it only reports clicks and shows how many filters are active. */
export function FilterTrigger({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-haspopup="dialog" className="btn-secondary relative !min-h-[40px] shrink-0 !rounded-full !px-3.5 sm:!px-4">
      <Icon name="sliders" size={15} />
      <span>Filters</span>
      {count > 0 && <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-ink-800 px-1 text-[11px] font-semibold text-paper-raised">{count}</span>}
    </button>
  );
}

/**
 * Filter sheet plus the row of active-filter chips. Filters live in one sheet (a bottom sheet on phones, a side drawer on
 * desktop); the page decides where the trigger button goes and owns the `open` state. The chip row is hidden when no filter is active.
 */
export default function FilterBar({
  children, active, onClear, resultCount, open, onOpenChange,
}: {
  /** The filter controls, shown inside the sheet. */
  children: React.ReactNode;
  active: ActiveFilter[];
  onClear: () => void;
  /** Shown on the sheet's confirm button, e.g. "Show 24 results". */
  resultCount?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      {active.length > 0 && (
        <ul aria-label="Active filters" className="-mx-3 mb-4 flex items-center gap-1.5 overflow-x-auto px-3 py-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {active.map((f) => (
            <li key={f.id} className="shrink-0">
              <span className="inline-flex min-h-[34px] items-center gap-1 rounded-full border border-line-strong bg-paper-raised pl-3 pr-1 text-[13px]">
                {f.label}
                <button type="button" onClick={f.onRemove} aria-label={`Remove filter ${f.label}`} className="grid h-7 w-7 place-items-center rounded-full text-mute hover:bg-paper-sunk hover:text-ink-900"><Icon name="close" size={12} /></button>
              </span>
            </li>
          ))}
          {active.length > 1 && <li className="shrink-0"><button type="button" onClick={onClear} className="min-h-[34px] px-2 text-xs font-semibold text-clay-600 hover:underline">Clear all</button></li>}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => onOpenChange(false)}
        title="Filters"
        variant="drawer"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={onClear} disabled={active.length === 0}>Clear all</button>
            <button type="button" className="btn-primary" onClick={() => onOpenChange(false)}>{resultCount !== undefined ? `Show ${resultCount.toLocaleString("en-US")} result${resultCount === 1 ? "" : "s"}` : "Show results"}</button>
          </>
        }
      >
        <div className="space-y-5">{children}</div>
      </Modal>
    </>
  );
}

/** Labelled group inside the filter sheet. */
export function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[13px] font-semibold">{title}</h3>
      {children}
    </section>
  );
}
