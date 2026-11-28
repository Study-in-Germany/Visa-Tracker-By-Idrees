"use client";

import StatusChip from "@/components/ui/StatusChip";

/**
 * Semantic application status indicator inside the sidebar account popover,
 * reusing the canonical rectangular StatusChip component.
 */
export default function ApplicantStatusChip({ status }: { status: string }) {
  return <StatusChip status={status} size="sm" />;
}
