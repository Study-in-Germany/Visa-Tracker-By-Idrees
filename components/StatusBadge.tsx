import StatusChip from "@/components/ui/StatusChip";

export default function StatusBadge({ status, short = false }: { status: string; short?: boolean }) {
  return <StatusChip status={status} short={short} size="sm" />;
}
