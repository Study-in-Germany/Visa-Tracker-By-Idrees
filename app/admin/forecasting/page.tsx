"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import Button from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Notice, LoadingBlock, ErrorState } from "@/components/ui/States";
import { apiFetch, jsonInit } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { fmtDate } from "@/lib/format";
import { CONSULATE_FIELD_OPTIONS } from "@/lib/options";
import type { BacktestHorizonMetric } from "@/lib/forecasting/types";

const QUEUE_TYPE_OPTIONS = [
  { value: "SUBMISSION_FRONTIER", label: "Submission frontier (WL date)" },
  { value: "APPOINTMENT_SUBMISSION_FRONTIER", label: "Appointment frontier (Doc sub date)" },
  { value: "APPOINTMENT_WL_COHORT_FRONTIER", label: "Appointment frontier (WL cohort)" },
];

export default function AdminForecastingPage() {
  const { data, error, loading, reload } = useApi<{
    sources: any[];
    timelines: any[];
    queueObservations: any[];
    snapshots: any[];
  }>("/api/admin/evidence");

  const [embassy, setEmbassy] = useState("Islamabad");
  const [queueType, setQueueType] = useState("SUBMISSION_FRONTIER");
  const [obsDate, setObsDate] = useState(new Date().toISOString().slice(0, 10));
  const [frontierDate, setFrontierDate] = useState("2026-03-10");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [backtestBusy, setBacktestBusy] = useState(false);
  const [backtest, setBacktest] = useState<{
    durationMs: number;
    cutoffs: string[];
    results: { Islamabad: BacktestHorizonMetric[]; Karachi: BacktestHorizonMetric[] };
  } | null>(null);

  async function addManualQueue(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      await apiFetch(
        "/api/admin/evidence",
        jsonInit("POST", {
          mode: "manual_queue",
          embassy,
          queueType,
          observationDate: obsDate,
          observedFrontierDate: frontierDate,
          notes: notes || undefined,
        })
      );
      setFeedback({ tone: "success", text: "Verified queue checkpoint saved and forecast cache invalidated." });
      setNotes("");
      reload();
    } catch (err: any) {
      setFeedback({ tone: "error", text: err?.message || "Could not save queue checkpoint." });
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, kind: "timeline" | "queue", verificationStatus: string) {
    setFeedback(null);
    try {
      await apiFetch(`/api/admin/evidence/${id}`, jsonInit("PATCH", { kind, verificationStatus }));
      setFeedback({ tone: "success", text: `Observation marked ${verificationStatus.toLowerCase()}.` });
      reload();
    } catch (err: any) {
      setFeedback({ tone: "error", text: err?.message || "Status update failed." });
    }
  }

  async function runBacktest() {
    setBacktestBusy(true);
    setFeedback(null);
    try {
      const res = await apiFetch<any>("/api/admin/forecasting/backtest");
      setBacktest(res);
    } catch (err: any) {
      setFeedback({ tone: "error", text: err?.message || "Backtest failed." });
    } finally {
      setBacktestBusy(false);
    }
  }

  if (loading && !data) return <LoadingBlock />;
  if (error) return <div className="card"><ErrorState error={error} onRetry={reload} /></div>;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Forecasting & evidence"
        description="Manage external historical evidence, record verified queue checkpoints, and audit rolling-origin backtests."
        actions={
          <Button type="button" variant="primary" size="sm" onClick={runBacktest} loading={backtestBusy}>
            Run rolling backtest
          </Button>
        }
      />

      {feedback && <Notice tone={feedback.tone}>{feedback.text}</Notice>}

      {/* Backtesting report */}
      {backtest && (
        <Panel
          title="Chronological rolling-origin backtesting results"
          description={`Cutoffs: ${backtest.cutoffs.join(", ")} · Completed in ${backtest.durationMs}ms (strict zero future-data leakage)`}
        >
          {(["Islamabad", "Karachi"] as const).map((emb) => (
            <div key={emb} className="mb-4 last:mb-0">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-mute">{emb}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-mute">
                      <th className="py-1.5 font-medium">Model</th>
                      <th className="py-1.5 text-right font-medium">N</th>
                      <th className="py-1.5 text-right font-medium">MAE</th>
                      <th className="py-1.5 text-right font-medium">Median AE</th>
                      <th className="py-1.5 text-right font-medium">Bias</th>
                      <th className="py-1.5 text-right font-medium">50% Cov.</th>
                      <th className="py-1.5 text-right font-medium">80% Cov.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {backtest.results[emb].map((row) => (
                      <tr key={row.modelName}>
                        <td className="py-1.5 font-medium">{row.modelName}</td>
                        <td className="py-1.5 text-right tabular-nums">{row.n}</td>
                        <td className="py-1.5 text-right tabular-nums">{row.maeDays !== null ? `${row.maeDays}d` : "—"}</td>
                        <td className="py-1.5 text-right tabular-nums">{row.medianAeDays !== null ? `${row.medianAeDays}d` : "—"}</td>
                        <td className="py-1.5 text-right tabular-nums">{row.biasDays !== null ? `${row.biasDays}d` : "—"}</td>
                        <td className="py-1.5 text-right tabular-nums">{row.coverage50Pct !== null ? `${row.coverage50Pct}%` : "—"}</td>
                        <td className="py-1.5 text-right tabular-nums">{row.coverage80Pct !== null ? `${row.coverage80Pct}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </Panel>
      )}

      {/* Manual verified queue observation + sources */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Record verified queue checkpoint" description="Manually audited queue positions immediately recalibrate model frontiers.">
          <form onSubmit={addManualQueue} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Embassy" htmlFor="mq-embassy">
                <Select id="mq-embassy" label="Embassy" value={embassy} onChange={setEmbassy} options={CONSULATE_FIELD_OPTIONS} />
              </Field>
              <Field label="Queue measurement" htmlFor="mq-type">
                <Select id="mq-type" label="Queue measurement" value={queueType} onChange={setQueueType} options={QUEUE_TYPE_OPTIONS} />
              </Field>
              <Field label="Observation date" htmlFor="mq-obs">
                <DatePicker id="mq-obs" label="Observation date" value={obsDate} onChange={setObsDate} />
              </Field>
              <Field label="Frontier date reached" htmlFor="mq-front">
                <DatePicker id="mq-front" label="Frontier date" value={frontierDate} onChange={setFrontierDate} />
              </Field>
            </div>
            <Field label="Audit note" htmlFor="mq-notes">
              <input id="mq-notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Verified against official portal batch" />
            </Field>
            <Button type="submit" variant="primary" size="sm" loading={busy}>
              Save queue checkpoint
            </Button>
          </form>
        </Panel>

        <Panel title="Evidence sources" description="Supplementary datasets are isolated from registered applicant accounts.">
          <ul className="divide-y divide-line text-xs">
            {data?.sources.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-900">{s.name}</p>
                  <p className="text-[11px] text-mute">
                    {s.sourceType} · {s.reliability} · Updated {fmtDate(s.lastUpdatedAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right tabular-nums text-mute">
                  <div>{s._count.timelines} timelines</div>
                  <div>{s._count.queueObservations} queue pts</div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Extracted timeline observations moderation */}
      <Panel title="Extracted community timelines" description="Review uncertain/conflicting entries or approve/reject observations.">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-mute">
                <th className="py-1.5 font-medium">Embassy</th>
                <th className="py-1.5 font-medium">WL joined</th>
                <th className="py-1.5 font-medium">Sub. invite</th>
                <th className="py-1.5 font-medium">Appt. invite</th>
                <th className="py-1.5 font-medium">Status</th>
                <th className="py-1.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data?.timelines.slice(0, 25).map((t) => (
                <tr key={t.id}>
                  <td className="py-1.5 font-medium">{t.embassy}</td>
                  <td className="py-1.5 tabular-nums">{t.waitingListJoinedDate ? fmtDate(t.waitingListJoinedDate) : "—"}</td>
                  <td className="py-1.5 tabular-nums">{t.submissionInvitedDate ? fmtDate(t.submissionInvitedDate) : "—"}</td>
                  <td className="py-1.5 tabular-nums">{t.appointmentInvitedDate ? fmtDate(t.appointmentInvitedDate) : "—"}</td>
                  <td className="py-1.5">
                    <Chip>{t.verificationStatus}</Chip>
                  </td>
                  <td className="py-1.5 text-right space-x-2">
                    {t.verificationStatus !== "APPROVED" && (
                      <button type="button" onClick={() => setStatus(t.id, "timeline", "APPROVED")} className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
                        Approve
                      </button>
                    )}
                    {t.verificationStatus !== "REJECTED" && (
                      <button type="button" onClick={() => setStatus(t.id, "timeline", "REJECTED")} className="font-semibold text-red-700 hover:underline dark:text-red-400">
                        Reject
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
