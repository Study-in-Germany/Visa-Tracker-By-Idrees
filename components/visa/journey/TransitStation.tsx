import Icon from "@/components/ui/Icon";
import type { TransitMilestoneView } from "@/lib/analytics/types";

export default function TransitStation({ milestone }: { milestone: TransitMilestoneView }) {
  const { state, terminalOutcome } = milestone;

  if (state === "completed") {
    return (
      <span
        data-station-node="completed"
        className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white dark:bg-emerald-500 dark:text-neutral-950"
        aria-hidden="true"
      >
        <Icon name="check" size={14} strokeWidth={2.75} />
      </span>
    );
  }

  if (state === "scheduled") {
    return (
      <span
        data-station-node="scheduled"
        className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink-800 bg-card text-ink-900 ring-4 ring-ink-900/10 dark:border-neutral-200 dark:ring-white/10"
        aria-hidden="true"
      >
        <Icon name="calendar" size={13} strokeWidth={2.25} />
      </span>
    );
  }

  if (state === "terminal") {
    if (terminalOutcome === "issued") {
      return (
        <span
          data-station-node="terminal-issued"
          className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white dark:bg-emerald-500 dark:text-neutral-950"
          aria-hidden="true"
        >
          <Icon name="check" size={14} strokeWidth={2.75} />
        </span>
      );
    }
    if (terminalOutcome === "rejected") {
      return (
        <span
          data-station-node="terminal-rejected"
          className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-red-600 text-white"
          aria-hidden="true"
        >
          <Icon name="close" size={14} strokeWidth={2.5} />
        </span>
      );
    }
    return (
      <span
        data-station-node="terminal-withdrawn"
        className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-neutral-500 text-white"
        aria-hidden="true"
      >
        <span className="h-0.5 w-2.5 rounded-full bg-current" />
      </span>
    );
  }

  if (state === "action-required") {
    return (
      <span
        data-station-node="action-required"
        className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-amber-500 bg-amber-50 text-amber-700 ring-4 ring-amber-500/15 dark:bg-amber-950/60 dark:text-amber-300"
        aria-hidden="true"
      >
        <Icon name="alert" size={13} strokeWidth={2.25} />
      </span>
    );
  }

  if (state === "current") {
    return (
      <span
        data-station-node="current"
        className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink-900 bg-card ring-4 ring-ink-900/10 dark:ring-white/15"
        aria-hidden="true"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-ink-900" />
      </span>
    );
  }

  if (state === "unavailable") {
    return (
      <span
        data-station-node="unavailable"
        className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-dashed border-line-strong bg-paper-sunk"
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      data-station-node="upcoming"
      className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-line-strong bg-card"
      aria-hidden="true"
    />
  );
}
