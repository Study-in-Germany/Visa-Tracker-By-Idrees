"use client";

import Icon, { type IconName } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/States";

export type DashboardStatCardProps = {
  label: string;
  value: string;
  supporting?: string;
  icon: IconName;
  loading?: boolean;
};

/**
 * Clean, minimal neutral statistics card: flat white surface, 1px neutral border,
 * subtle label + monochrome icon on top, primary metric, and concise supporting line.
 */
export default function DashboardStatCard({
  label,
  value,
  supporting,
  icon,
  loading = false,
}: DashboardStatCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-line bg-card p-4" aria-busy="true">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
        <Skeleton className="mt-3 h-7 w-28" />
        <Skeleton className="mt-2 h-3 w-32" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-mute">{label}</span>
        <Icon name={icon} size={16} className="shrink-0 text-mute" />
      </div>
      <p className="mt-2 truncate text-[22px] font-semibold leading-tight tracking-tight tabular-nums text-ink-900">
        {value}
      </p>
      <p className="mt-1 truncate text-xs text-mute">{supporting || "—"}</p>
    </div>
  );
}
