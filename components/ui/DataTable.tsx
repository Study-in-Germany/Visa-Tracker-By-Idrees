"use client";

import { useRouter } from "next/navigation";
import Icon from "./Icon";
import ColumnFilter, { ColumnFilterConfig } from "./ColumnFilter";
import { EmptyState, ErrorState, LoadingBlock } from "./States";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Server sort field. Omit for non-sortable columns. */
  sortKey?: string;
  align?: "left" | "right";
  /** Hide this column in the table below the breakpoint (tablet prioritisation). */
  hideBelow?: "lg" | "xl";
  /** Adds a funnel button to the header that filters by this column. */
  filter?: ColumnFilterConfig;
  /** Role in the mobile card: title (top-left), badge (top-right), or a labelled detail row (default). "hidden" omits it. */
  mobile?: "title" | "badge" | "detail" | "hidden";
};

export type SortState = { key: string; dir: "asc" | "desc" } | null;

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyHint?: string;
  sort?: SortState;
  onSort?: (s: SortState) => void;
  page?: number;
  pageCount?: number;
  total?: number;
  onPage?: (p: number) => void;
  /** Per-row actions, shown as a trailing column / card footer. */
  actions?: (row: T) => React.ReactNode;
  caption: string;
  /** Makes each row open this URL when clicked (links and buttons inside the row still work on their own). */
  rowHref?: (row: T) => string;
  /** Render without its own card so it can sit inside a toolbar card. */
  embedded?: boolean;
  /** Hex colour that washes the row (left rail + fading tint). */
  rowAccent?: (row: T) => string | undefined;
};

const wash = (hex?: string): React.CSSProperties | undefined =>
  hex ? { backgroundImage: `linear-gradient(90deg, ${hex}26 0%, ${hex}0d 45%, transparent 80%)` } : undefined;
const rail = (hex?: string): React.CSSProperties | undefined => (hex ? { boxShadow: `inset 4px 0 0 ${hex}` } : undefined);

const HIDE = { lg: "hidden lg:table-cell", xl: "hidden xl:table-cell" } as const;

export default function DataTable<T>({
  columns, rows, rowKey, loading, error, onRetry, emptyTitle = "Nothing here yet", emptyHint,
  sort, onSort, page = 1, pageCount = 1, total, onPage, actions, caption, embedded, rowHref, rowAccent,
}: Props<T>) {
  const router = useRouter();
  const openRow = (e: React.MouseEvent, row: T) => {
    if (!rowHref) return;
    if ((e.target as HTMLElement).closest("a,button,input,select,textarea,[role=button]")) return;
    if (e.metaKey || e.ctrlKey) window.open(rowHref(row), "_blank");
    else router.push(rowHref(row));
  };
  const toggleSort = (key: string) => {
    if (!onSort) return;
    if (!sort || sort.key !== key) onSort({ key, dir: "asc" });
    else if (sort.dir === "asc") onSort({ key, dir: "desc" });
    else onSort(null);
  };

  const shell = embedded ? "" : "card";
  if (error && rows.length === 0) return <div className={shell}><ErrorState error={error} onRetry={onRetry} /></div>;
  if (loading && rows.length === 0) return <div className={`${shell} p-4`}><LoadingBlock label={`Loading ${caption}`} rows={10} /></div>;
  if (!loading && rows.length === 0) return <div className={shell}><EmptyState title={emptyTitle} hint={emptyHint} /></div>;

  const title = columns.find((c) => c.mobile === "title") ?? columns[0];
  const badge = columns.find((c) => c.mobile === "badge");
  const details = columns.filter((c) => c !== title && c !== badge && c.mobile !== "hidden");

  return (
    <div className={`transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
      {/* Tablet / desktop table */}
      <div className={`${embedded ? "" : "card"} hidden overflow-x-auto md:block`}>
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className={`border-b border-line bg-paper-sunk/60 text-left text-[11px] uppercase tracking-wider text-mute ${embedded ? "border-t" : ""}`}>
            <tr>
              {columns.map((c) => {
                const sorted = !!sort && !!c.sortKey && sort.key === c.sortKey;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={sorted ? (sort?.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={`px-3 py-2 font-semibold ${c.align === "right" ? "text-right" : ""} ${c.hideBelow ? HIDE[c.hideBelow] : ""}`}
                  >
                    <div className={`flex items-center gap-0.5 ${c.align === "right" ? "justify-end" : ""}`}>
                      {c.sortKey && onSort ? (
                        <button type="button" onClick={() => toggleSort(c.sortKey!)} className="inline-flex min-h-[28px] items-center gap-1 uppercase tracking-wider hover:text-ink-900">
                          {c.header}
                          {sorted && <Icon name={sort?.dir === "asc" ? "chevronUp" : "chevronDown"} size={14} />}
                        </button>
                      ) : (
                        <span>{c.header}</span>
                      )}
                      {c.filter && <ColumnFilter filter={c.filter} />}
                    </div>
                  </th>
                );
              })}
              {actions && <th scope="col" className="px-3 py-2 text-right font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={rowKey(row)} onClick={(e) => openRow(e, row)} style={wash(rowAccent?.(row))} className={`hover:brightness-95 ${rowHref ? "cursor-pointer" : ""}`}>
                {columns.map((c, ci) => (
                  <td key={c.key} style={ci === 0 ? rail(rowAccent?.(row)) : undefined} className={`px-3 py-2 align-middle ${c.align === "right" ? "text-right" : ""} ${c.hideBelow ? HIDE[c.hideBelow] : ""}`}>
                    {c.cell(row)}
                  </td>
                ))}
                {actions && <td className="whitespace-nowrap px-3 py-1.5 text-right">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile records */}
      <ul className={embedded ? "divide-y divide-line border-t border-line md:hidden" : "space-y-2 md:hidden"} aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} onClick={(e) => openRow(e, row)} className={`${embedded ? "p-3" : "card p-3"} ${rowHref ? "cursor-pointer active:bg-paper-sunk/60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 break-words font-medium">{title.cell(row)}</div>
              {badge && <div className="shrink-0">{badge.cell(row)}</div>}
            </div>
            {details.length > 0 && (
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                {details.map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-xs text-ink-600">{c.header}</dt>
                    <dd className="break-words">{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {actions && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">{actions(row)}</div>}
          </li>
        ))}
      </ul>

      {(pageCount > 1 || total !== undefined) && (
        <nav aria-label="Pagination" className={`${embedded ? "border-t border-line px-3 py-2" : "mt-3"} flex flex-wrap items-center justify-between gap-2 text-xs text-mute`}>
          <span>{total !== undefined ? `${total.toLocaleString("en-US")} ${total === 1 ? "record" : "records"}` : ""}</span>
          {pageCount > 1 && onPage && (
            <div className="flex items-center gap-1">
              <button type="button" className="btn-secondary !min-h-[30px] !px-1.5" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
                <Icon name="chevronLeft" />
              </button>
              <span className="px-2 text-ink-700">Page {page} of {pageCount}</span>
              <button type="button" className="btn-secondary !min-h-[30px] !px-1.5" disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label="Next page">
                <Icon name="chevronRight" />
              </button>
            </div>
          )}
        </nav>
      )}
    </div>
  );
}
