import Icon from "./Icon";

/** Previous / next pager with a record count. Renders nothing when there is a single page and no count. */
export default function Pagination({
  page, pageCount, total, noun = "records", onPage, className = "",
}: {
  page: number;
  pageCount: number;
  total?: number;
  noun?: string;
  onPage: (p: number) => void;
  className?: string;
}) {
  if (pageCount <= 1 && total === undefined) return null;
  return (
    <nav aria-label="Pagination" className={`flex items-center justify-between gap-2 text-[13px] text-mute ${className}`}>
      <span>{total !== undefined ? `${total.toLocaleString("en-US")} ${noun}` : ""}</span>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" className="btn-secondary !min-h-[40px] !px-3" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
            <Icon name="chevronLeft" />
          </button>
          <span className="px-2 tabular-nums text-ink-700">{page} / {pageCount}</span>
          <button type="button" className="btn-secondary !min-h-[40px] !px-3" disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label="Next page">
            <Icon name="chevronRight" />
          </button>
        </div>
      )}
    </nav>
  );
}
