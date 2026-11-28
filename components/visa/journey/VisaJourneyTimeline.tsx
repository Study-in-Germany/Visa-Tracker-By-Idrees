"use client";

import type { TransitMilestoneState, TransitMilestoneView } from "@/lib/analytics/types";
import { fmtDate } from "@/lib/format";
import {
  CORE_SUBMISSION_STATIONS,
  getTodayIsoLocal,
  isFutureScheduledDate,
  type SubmissionMilestoneKey,
  type SubmissionMilestoneValues,
} from "@/lib/journey-validation";
import MilestoneDateControl from "./MilestoneDateControl";
import TransitConnector from "./TransitConnector";
import TransitStation from "./TransitStation";

export type JourneyMode = "dashboard" | "editable" | "review";

export interface JourneyTimelineStation {
  key: SubmissionMilestoneKey;
  label: string;
  value: string;
  allowFuture: boolean;
  state: TransitMilestoneState;
  isScheduled: boolean;
  error?: string;
}

export function normalizeSubmissionStations(
  values: Partial<SubmissionMilestoneValues>,
  errors: Partial<Record<SubmissionMilestoneKey, string>> = {},
  todayIso = getTodayIsoLocal()
): JourneyTimelineStation[] {
  return CORE_SUBMISSION_STATIONS.map((meta) => {
    const value = (values[meta.key] ?? "").trim();
    const error = errors[meta.key];
    const isScheduled = Boolean(value && meta.allowFuture && isFutureScheduledDate(value, todayIso));

    let state: TransitMilestoneState = "upcoming";
    if (error) {
      state = "action-required";
    } else if (value) {
      state = isScheduled ? "scheduled" : "completed";
    }

    return {
      key: meta.key,
      label: meta.label,
      value,
      allowFuture: meta.allowFuture,
      state,
      isScheduled,
      error,
    };
  });
}

function toTransitView(station: JourneyTimelineStation): TransitMilestoneView {
  return {
    id: station.key,
    label: station.label,
    actualDate: station.value || null,
    formattedActualDate: station.value ? fmtDate(station.value) : null,
    estimatedRange: null,
    state: station.state,
    terminalOutcome: null,
    confidence: null,
    statusLabel: station.isScheduled ? "Scheduled" : station.value ? "Recorded" : "Not recorded",
    isCurrentStep: false,
    milestoneField: station.key,
  };
}

function isSegmentDone(cur: JourneyTimelineStation, next?: JourneyTimelineStation): boolean {
  if (!next) return false;
  return cur.state === "completed" && next.state === "completed";
}

function stationAriaLabel(station: JourneyTimelineStation): string {
  if (station.error) return `${station.label}, invalid date, ${station.error}`;
  if (station.isScheduled) return `${station.label}, scheduled for ${fmtDate(station.value)}`;
  if (station.value) return `${station.label}, recorded ${fmtDate(station.value)}`;
  return `${station.label}, not recorded`;
}

/**
 * Shared connected transit-style visa journey timeline supporting editable entry
 * and read-only review modes while reusing TransitStation and TransitConnector.
 */
export default function VisaJourneyTimeline({
  mode,
  values,
  errors = {},
  todayIso,
  onChange,
  idPrefix = "vj",
}: {
  mode: Exclude<JourneyMode, "dashboard">;
  values: Partial<SubmissionMilestoneValues>;
  errors?: Partial<Record<SubmissionMilestoneKey, string>>;
  todayIso?: string;
  onChange?: (key: SubmissionMilestoneKey, value: string) => void;
  idPrefix?: string;
}) {
  const resolvedToday = todayIso || getTodayIsoLocal();
  const stations = normalizeSubmissionStations(values, errors, resolvedToday);

  const renderDetail = (station: JourneyTimelineStation, align: "center" | "left", suffix: string) => {
    if (mode === "editable" && onChange) {
      return (
        <MilestoneDateControl
          id={`${idPrefix}-${station.key}-${suffix}`}
          label={station.label}
          value={station.value}
          onChange={(v) => onChange(station.key, v)}
          allowFuture={station.allowFuture}
          todayIso={resolvedToday}
          error={station.error}
          align={align}
        />
      );
    }

    // Review mode: read-only actual / scheduled / unrecorded state
    const alignCls = align === "center" ? "text-center" : "text-left";
    if (station.value) {
      return (
        <div className={`mt-1 ${alignCls}`}>
          <p className="text-[12px] font-semibold tabular-nums text-ink-900">
            {fmtDate(station.value)}
          </p>
          {station.isScheduled && (
            <p className="text-[10.5px] font-medium text-mute">Scheduled</p>
          )}
        </div>
      );
    }
    return (
      <p className={`mt-1 text-[11.5px] text-mute ${alignCls}`}>Not recorded</p>
    );
  };

  return (
    <div data-testid={`visa-journey-timeline-${mode}`}>
      {/* Desktop horizontal connected transit map */}
      <ol
        data-testid="visa-journey-desktop"
        aria-label="Visa journey milestones"
        className="hidden md:grid"
        style={{ gridTemplateColumns: `repeat(${stations.length}, minmax(0, 1fr))` }}
      >
        {stations.map((station, idx) => {
          const prev = idx > 0 ? stations[idx - 1] : undefined;
          const next = idx < stations.length - 1 ? stations[idx + 1] : undefined;
          const leftDone = prev ? isSegmentDone(prev, station) : false;
          const rightDone = isSegmentDone(station, next);

          return (
            <li
              key={station.key}
              data-testid={`journey-station-${station.key}`}
              aria-label={stationAriaLabel(station)}
              className="flex min-w-0 flex-col items-center"
            >
              <div className="relative flex h-8 w-full items-center justify-center">
                {idx > 0 && (
                  <div className="absolute left-0 right-1/2 top-1/2 -translate-y-1/2">
                    <TransitConnector orientation="horizontal" completed={leftDone} />
                  </div>
                )}
                {idx < stations.length - 1 && (
                  <div className="absolute left-1/2 right-0 top-1/2 -translate-y-1/2">
                    <TransitConnector orientation="horizontal" completed={rightDone} />
                  </div>
                )}
                <TransitStation milestone={toTransitView(station)} />
              </div>

              <div className="mt-2 w-full px-1 text-center">
                <p className="text-[12px] font-medium leading-snug text-ink-900">
                  {station.label}
                </p>
                {renderDetail(station, "center", "d")}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Mobile vertical connected transit map */}
      <ol
        data-testid="visa-journey-mobile"
        aria-label="Visa journey milestones"
        className="md:hidden"
      >
        {stations.map((station, idx) => {
          const next = idx < stations.length - 1 ? stations[idx + 1] : undefined;
          const downDone = isSegmentDone(station, next);
          const isLast = idx === stations.length - 1;

          return (
            <li
              key={station.key}
              data-testid={`journey-station-mobile-${station.key}`}
              aria-label={stationAriaLabel(station)}
              className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3"
            >
              <div className="relative flex flex-col items-center">
                <TransitStation milestone={toTransitView(station)} />
                {!isLast && (
                  <div
                    className="absolute bottom-[-14px] left-1/2 top-[14px] -translate-x-1/2"
                    aria-hidden="true"
                  >
                    <TransitConnector orientation="vertical" completed={downDone} />
                  </div>
                )}
              </div>

              <div className={isLast ? "pt-0.5" : "pb-5 pt-0.5"}>
                <p className="text-[13px] font-medium leading-snug text-ink-900">
                  {station.label}
                </p>
                {renderDetail(station, "left", "m")}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
