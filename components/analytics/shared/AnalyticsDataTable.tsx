"use client";

export interface AnalyticsTableColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
}

export default function AnalyticsDataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
}: {
  caption: string;
  columns: AnalyticsTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-paper-sunk px-3 py-5 text-center text-xs text-mute">
        No rows available for this view.
      </p>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-left text-[12px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line bg-paper-sunk text-[11px] font-semibold uppercase tracking-wider text-mute">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`whitespace-nowrap px-3 py-2 ${
                  col.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-paper-raised">
          {rows.map((row, idx) => (
            <tr key={rowKey(row, idx)} className="hover:bg-[rgb(var(--hover)/0.5)]">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-2 tabular-nums text-ink-800 ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
