import { VISA_STATUS_COLORS, VISA_STATUS_HEX, VISA_STATUS_LABELS, VISA_STATUS_SHORT } from "@/lib/constants";

export default function StatusBadge({ status, short = false }: { status: string; short?: boolean }) {
  const color = VISA_STATUS_COLORS[status] || VISA_STATUS_COLORS.OTHER;
  const hex = VISA_STATUS_HEX[status] || VISA_STATUS_HEX.OTHER;
  const label = (short ? VISA_STATUS_SHORT[status] : VISA_STATUS_LABELS[status]) || status;
  return (
    <span className={`badge !rounded-full !px-2 ${color}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: hex }} aria-hidden="true" />
      {label}
    </span>
  );
}
