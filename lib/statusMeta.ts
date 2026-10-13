import type { IconName } from "@/components/ui/Icon";
import type { StatTone } from "@/components/ui/StatCard";

/** Icon + stat-card tone for each visa status, shared by every page that shows status counts. */
export const STATUS_META: Record<string, { icon: IconName; tone: StatTone }> = {
  WAITING_LIST: { icon: "clock", tone: "neutral" },
  WAITING_FOR_SUBMISSION: { icon: "hourglass", tone: "warn" },
  SUBMISSION_RECEIVED: { icon: "send", tone: "sage" },
  UNDER_CORRECTION: { icon: "edit", tone: "accent" },
  APPOINTMENT_SCHEDULED: { icon: "calendar", tone: "sage" },
  PROCESSING: { icon: "cog", tone: "warn" },
  VISA_ISSUED: { icon: "checkCircle", tone: "good" },
  VISA_REJECTED: { icon: "xcircle", tone: "bad" },
  WITHDRAWN: { icon: "logout", tone: "neutral" },
  OTHER: { icon: "info", tone: "neutral" },
};
