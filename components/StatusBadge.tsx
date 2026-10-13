import { VISA_STATUS_COLORS, VISA_STATUS_LABELS } from "@/lib/constants";

export default function StatusBadge({ status }: { status: string }) {
  const color = VISA_STATUS_COLORS[status] || VISA_STATUS_COLORS.OTHER;
  const label = VISA_STATUS_LABELS[status] || status;
  return <span className={`badge ${color}`}>{label}</span>;
}
