"use client";

import TablePagination, { type TablePaginationProps } from "@/components/ui/TablePagination";

/**
 * Tracker workspace pagination bar anchored to the bottom of the desktop table workspace.
 */
export default function TrackerPagination(props: Omit<TablePaginationProps, "noun" | "pinned">) {
  return <TablePagination {...props} noun="records" pinned />;
}
