"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import { Notice } from "@/components/ui/States";
import TransitVisaJourney from "@/components/visa/journey/TransitVisaJourney";
import { adaptTransitJourney } from "@/lib/analytics/adapters";
import { formatDisplayDate } from "@/lib/analytics/formatters";
import { apiFetch, jsonInit } from "@/lib/api";
import type { PersonalForecastResult } from "@/lib/forecasting/types";
import { CONSULATE_FIELD_OPTIONS } from "@/lib/options";

export default function TimelineCalculator({ initialForecast }: { initialForecast?: PersonalForecastResult | null }) {
  const [embassy, setEmbassy] = useState<"Islamabad" | "Karachi">("Islamabad");
  const [waitingListJoinedDate, setWaitingListJoinedDate] = useState("2026-04-01");
  const [submissionInvitedDate, setSubmissionInvitedDate] = useState("");
  const [documentsSubmittedDate, setDocumentsSubmittedDate] = useState("");
  const [correctionSubmittedDate, setCorrectionSubmittedDate] = useState("");
  const [appointmentInvitedDate, setAppointmentInvitedDate] = useState("");
  const [appointmentAttendedDate, setAppointmentAttendedDate] = useState("");
  const [expectedDelayDays, setExpectedDelayDays] = useState("3");
  const [showOptional, setShowOptional] = useState(false);
  const [scenario, setScenario] = useState<"faster" | "typical" | "slower">("typical");

  const [forecast, setForecast] = useState<PersonalForecastResult | null>(initialForecast ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function calculate(e: React.FormEvent) {
    e.preventDefault();
    if (!waitingListJoinedDate) {
      setError("Enter your waiting-list joining date to calculate a forecast.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch<{ forecast: PersonalForecastResult }>(
        "/api/forecast",
        jsonInit("POST", {
          embassy,
          waitingListJoinedDate,
          submissionInvitedDate: submissionInvitedDate || "",
          documentsSubmittedDate: documentsSubmittedDate || "",
          correctionSubmittedDate: correctionSubmittedDate || "",
          appointmentInvitedDate: appointmentInvitedDate || "",
          appointmentAttendedDate: appointmentAttendedDate || "",
          expectedSubmissionDelayDays: Number(expectedDelayDays) || 3,
        })
      );
      setForecast(res.forecast);
    } catch (err: any) {
      setError(err?.message || "Could not compute timeline forecast.");
    } finally {
      setLoading(false);
    }
  }

  const journeyView = forecast
    ? adaptTransitJourney(
        forecast,
        {
          waitingListDate: waitingListJoinedDate || null,
          submissionInviteDate: submissionInvitedDate || null,
          documentSubmissionDate: documentsSubmittedDate || null,
          correctionSubmittedDate: correctionSubmittedDate || null,
          appointmentInviteDate: appointmentInvitedDate || null,
          appointmentDate: appointmentAttendedDate || null,
          interviewDate: appointmentAttendedDate || null,
        },
        { scenario }
      )
    : null;
  const activeScenario = forecast?.scenarios.find((s) => s.key === scenario) ?? forecast?.scenarios[1];
  const submissionDone = forecast?.stages.find((s) => s.stage === "SUBMISSION_INVITED")?.status === "completed";
  const apptInviteDone = forecast?.stages.find((s) => s.stage === "APPOINTMENT_INVITED")?.status === "completed";
  const decisionDone = forecast?.stages.find((s) => s.stage === "DECISION_MADE")?.status === "completed";

  return (
    <div className="space-y-4">
      <form onSubmit={calculate} className="card space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-bold tracking-tight text-ink-900">Calculate your remaining visa timeline</h2>
            <p className="text-xs text-mute">
              No account or personal details required. Adding completed stages refines all remaining estimates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            {showOptional ? "Hide optional milestones" : "+ Add completed milestones"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Embassy" htmlFor="calc-embassy" required>
            <Select
              id="calc-embassy"
              label="Embassy"
              value={embassy}
              onChange={(v) => setEmbassy(v === "Karachi" ? "Karachi" : "Islamabad")}
              options={CONSULATE_FIELD_OPTIONS}
            />
          </Field>
          <Field label="Waiting-list joining date" htmlFor="calc-wl" required>
            <DatePicker
              id="calc-wl"
              label="Waiting-list joining date"
              value={waitingListJoinedDate}
              onChange={setWaitingListJoinedDate}
            />
          </Field>
          <Field label="Expected upload delay (days)" htmlFor="calc-delay" hint="Time you take after invite to upload files">
            <input
              id="calc-delay"
              type="number"
              min={0}
              max={60}
              className="input"
              value={expectedDelayDays}
              onChange={(e) => setExpectedDelayDays(e.target.value)}
            />
          </Field>
        </div>

        {showOptional && (
          <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Submission invite" htmlFor="calc-si">
              <DatePicker id="calc-si" label="Submission invite" value={submissionInvitedDate} onChange={setSubmissionInvitedDate} />
            </Field>
            <Field label="Docs submitted" htmlFor="calc-ds">
              <DatePicker id="calc-ds" label="Docs submitted" value={documentsSubmittedDate} onChange={setDocumentsSubmittedDate} />
            </Field>
            <Field label="Correction submitted" htmlFor="calc-cs">
              <DatePicker id="calc-cs" label="Correction submitted" value={correctionSubmittedDate} onChange={setCorrectionSubmittedDate} />
            </Field>
            <Field label="Appointment invite" htmlFor="calc-ai">
              <DatePicker id="calc-ai" label="Appointment invite" value={appointmentInvitedDate} onChange={setAppointmentInvitedDate} />
            </Field>
            <Field label="Physical appointment" htmlFor="calc-at">
              <DatePicker id="calc-at" label="Physical appointment" value={appointmentAttendedDate} onChange={setAppointmentAttendedDate} />
            </Field>
          </div>
        )}

        {error && <Notice tone="error">{error}</Notice>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="submit" variant="primary" loading={loading}>
            Estimate timeline
          </Button>
          <span className="text-[11px] text-mute">
            Inputs stay in your browser and are never saved to the community tracker.
          </span>
        </div>
      </form>

      {journeyView && forecast && (
        <>
          <TransitVisaJourney
            data={journeyView}
            title="Estimated visa timeline"
            hideCalculatorLink
            headerAction={
              <div className="inline-flex rounded-lg border border-line bg-paper-sunk p-0.5 text-[11px]" role="group" aria-label="Planning scenario">
                {(["faster", "typical", "slower"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setScenario(k)}
                    className={`rounded-md px-2.5 py-1 font-semibold capitalize transition-colors ${
                      scenario === k ? "bg-paper-raised text-ink-900 shadow-xs" : "text-mute hover:text-ink-900"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            }
          />

          {/* Scenario & pace comparison (kept inside Calculator only, suppressed for completed stages) */}
          {activeScenario && (!submissionDone || !apptInviteDone || !decisionDone) && (
            <section className="card grid gap-3 p-4 lg:grid-cols-2" aria-label="Scenario comparison">
              <div className="rounded-lg border border-line bg-paper-sunk/60 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">
                  Scenario: {scenario}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-[11px] text-mute">Submission invite</p>
                    <p className="font-semibold tabular-nums">
                      {submissionDone
                        ? formatDisplayDate(forecast.stages[1]?.actualDate)
                        : activeScenario.submissionInviteDate
                          ? formatDisplayDate(activeScenario.submissionInviteDate)
                          : "Unavailable"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-mute">Appointment invite</p>
                    <p className="font-semibold tabular-nums">
                      {apptInviteDone
                        ? formatDisplayDate(forecast.stages[3]?.actualDate)
                        : activeScenario.appointmentInviteDate
                          ? formatDisplayDate(activeScenario.appointmentInviteDate)
                          : "Unavailable"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-mute">Visa decision</p>
                    <p className="font-semibold tabular-nums">
                      {decisionDone
                        ? formatDisplayDate(forecast.stages[5]?.actualDate)
                        : activeScenario.decisionDate
                          ? formatDisplayDate(activeScenario.decisionDate)
                          : "Unavailable"}
                    </p>
                  </div>
                </div>
              </div>

              {forecast.speedSensitivity.length > 0 && (
                <div className="rounded-lg border border-line bg-paper-sunk/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">
                    If recent invitation pace continues
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    {forecast.speedSensitivity.map((sp) => (
                      <div key={sp.windowDays}>
                        <p className="text-[11px] text-mute">{sp.windowDays}-day pace</p>
                        <p className="font-semibold tabular-nums">
                          {sp.estimatedSubmissionInviteDate ? formatDisplayDate(sp.estimatedSubmissionInviteDate) : "Unavailable"}
                        </p>
                        <p className="text-[10px] text-mute">
                          {sp.weeklyVelocityDays !== null ? `${sp.weeklyVelocityDays}d/wk` : "No span"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
