import { Chip } from "@/components/ui/Chip";
import { LISTING_STATUS_COLORS, LISTING_STATUS_LABELS } from "@/lib/marketplace";

export default function ListingStatusBadge({ status }: { status: string }) {
  return <Chip className={LISTING_STATUS_COLORS[status]}>{LISTING_STATUS_LABELS[status] ?? status}</Chip>;
}
