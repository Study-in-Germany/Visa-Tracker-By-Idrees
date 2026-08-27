import { VISA_STATUS_COLORS, VISA_STATUS_LABELS } from "@/lib/constants";

export default function StatusBadge({ status }: { status: string }) {
  const color = VISA_STATUS_COLORS[status] || "bg-gray-100 text-gray-800 border-gray-200";
  const label = VISA_STATUS_LABELS[status] || status;
  return <span className={`badge ${color}`}>{label}</span>;
}
