"use client";

import { useRef, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import Icon from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import { EmptyState, ErrorState, Notice } from "@/components/ui/States";
import { useApi } from "@/hooks/useApi";
import { useJobRunner, type JobDto } from "@/hooks/useJobRunner";
import { apiFetch, jsonInit } from "@/lib/api";
import { fmtDay } from "@/lib/deadline";

const KIND_LABEL: Record<string, string> = {
  "programme-links": "Programme link check", hrk: "HRK university list", wikidata: "Wikidata logos & IDs", linkcheck: "Website check", programmes: "Programme file", maintenance: "Verification upkeep",
};
const STATUS_TONE = { QUEUED: "neutral", RUNNING: "accent", DONE: "good", FAILED: "bad" } as const;

type ReviewItem = { id: string; name: string; degreeLevel: string; winterDeadline: string | null; summerDeadline: string | null; verification: string; sourceUrl: string | null; pendingChange: any; university: { name: string } };

function JobRow({ job, busy, onResume }: { job: JobDto; busy: boolean; onResume: () => void }) {
  const [open, setOpen] = useState(false);
  const pct = job.total ? Math.round((job.processed / job.total) * 100) : job.status === "DONE" ? 100 : 0;
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold">{KIND_LABEL[job.kind] ?? job.kind}</span>
        <Chip tone={STATUS_TONE[job.status]}>{job.interrupted ? "Interrupted" : job.status.toLowerCase()}</Chip>
        <span className="text-xs text-mute">{fmtDay(job.createdAt)}</span>
        {(job.interrupted || job.status === "QUEUED") && !busy && <button type="button" onClick={onResume} className="btn-secondary !min-h-[32px] !px-3 text-xs">Resume</button>}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-sunk" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress">
        <div className="h-full rounded-full bg-clay-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-mute tabular-nums">
        {job.processed}/{job.total} · {job.created} new · {job.updated} updated · {job.skipped} unchanged · {job.failed} failed
      </p>
      {job.error && <p className="mt-1 text-xs text-red-700">{job.error}</p>}
      {job.log.length > 0 && (
        <>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-1 text-xs font-medium text-clay-600 hover:underline">{open ? "Hide log" : "Show log"}</button>
          {open && <pre className="mt-1 max-h-56 overflow-auto rounded-lg bg-paper-sunk p-2.5 text-[11px] leading-relaxed">{job.log.join("\n")}</pre>}
        </>
      )}
    </li>
  );
}

function FileAction({ title, hint, accept, kind, disabled, onStart, extra }: { title: string; hint: string; accept: string; kind: "hrk" | "programmes"; disabled: boolean; onStart: (kind: string, file: File) => void; extra?: React.ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line p-3.5">
      <div>
        <h3 className="text-[13px] font-semibold">{title}</h3>
        <p className="mt-0.5 text-xs text-mute">{hint}</p>
      </div>
      <input ref={input} type="file" accept={accept} className="sr-only" aria-label={title} onChange={(e) => { const f = e.target.files?.[0]; if (f) onStart(kind, f); if (input.current) input.current.value = ""; }} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={disabled} onClick={() => input.current?.click()} className="btn-primary !min-h-[36px]"><Icon name="upload" size={14} /> Choose file</button>
        {extra}
      </div>
    </div>
  );
}

function ReviewList() {
  const { data, error, loading, reload } = useApi<{ items: ReviewItem[] }>("/api/admin/programmes/review");
  const [err, setErr] = useState("");
  async function act(id: string, action: "accept" | "reject" | "verify") {
    setErr("");
    try { await apiFetch(`/api/admin/programmes/${id}/review`, jsonInit("PATCH", { action })); reload(); } catch (e: any) { setErr(e?.message); }
  }
  const items = data?.items ?? [];
  if (error && !items.length) return <ErrorState error={error} onRetry={reload} />;
  if (!loading && items.length === 0) return <EmptyState title="Nothing to review" hint="Conflicting imports show up here before they can change verified deadlines." />;
  return (
    <ul className="divide-y divide-line">
      {err && <Notice tone="error">{err}</Notice>}
      {items.map((p) => (
        <li key={p.id} className="space-y-1.5 py-3 first:pt-0">
          <p className="text-[13px] font-semibold">{p.university.name} <span className="font-normal text-mute">· {p.name}</span></p>
          <p className="text-xs text-ink-700">Current: winter {fmtDay(p.winterDeadline)}, summer {fmtDay(p.summerDeadline)}</p>
          {p.pendingChange && <p className="text-xs text-ink-700">Imported: winter {p.pendingChange.winterDeadline ? fmtDay(p.pendingChange.winterDeadline) : "—"}, summer {p.pendingChange.summerDeadline ? fmtDay(p.pendingChange.summerDeadline) : "—"}{p.pendingChange.sourceUrl && <> · <a className="text-clay-600 hover:underline" href={p.pendingChange.sourceUrl} target="_blank" rel="noopener noreferrer">source</a></>}</p>}
          <div className="flex flex-wrap gap-2">
            {p.pendingChange && <button type="button" className="btn-primary !min-h-[34px] !px-3 text-xs" onClick={() => act(p.id, "accept")}>Use imported</button>}
            <button type="button" className="btn-secondary !min-h-[34px] !px-3 text-xs" onClick={() => act(p.id, p.pendingChange ? "reject" : "verify")}>{p.pendingChange ? "Keep current" : "Mark verified"}</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ImportsPage() {
  const { data, error, loading, reload } = useApi<{ jobs: JobDto[] }>("/api/admin/imports");
  const { activeId, error: runError, drive } = useJobRunner(reload);
  const [startError, setStartError] = useState("");
  const jobs = data?.jobs ?? [];
  const busy = !!activeId;

  async function start(kind: string, file?: File) {
    setStartError("");
    try {
      const body = new FormData();
      body.append("kind", kind);
      if (file) body.append("file", file);
      const { id } = await apiFetch<{ id: string }>("/api/admin/imports", { method: "POST", body });
      drive(id);
    } catch (e: any) {
      setStartError(e?.message || "Couldn't start the import.");
    }
  }

  const simple = (kind: string, title: string, hint: string) => (
    <div className="flex flex-col justify-between gap-2 rounded-xl border border-line p-3.5">
      <div>
        <h3 className="text-[13px] font-semibold">{title}</h3>
        <p className="mt-0.5 text-xs text-mute">{hint}</p>
      </div>
      <button type="button" disabled={busy} onClick={() => start(kind)} className="btn-secondary !min-h-[36px] self-start">Run now</button>
    </div>
  );

  return (
    <>
      <PageHeader title="Data imports" />
      {(startError || runError) && <div className="mb-3"><Notice tone="error">{startError || runError}</Notice></div>}
      {busy && <div className="mb-3"><Notice>Import running. Keep this page open; it continues in the background if you leave and can be resumed.</Notice></div>}

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Start an import">
          <div className="grid gap-3 sm:grid-cols-2">
            <FileAction kind="hrk" accept=".tsv,.csv,.txt" disabled={busy} onStart={start} title="University list (HRK)" hint="Tab-separated Hochschulkompass export. Safe to repeat: existing records are updated, never duplicated." />
            <FileAction kind="programmes" accept=".csv,.xlsx" disabled={busy} onStart={start} title="Programmes (CSV / XLSX)" hint="Deadlines are saved as verified only with a source link and “verified = yes”." extra={<a href="/api/admin/imports/template" className="text-xs font-medium text-clay-600 hover:underline">Download template</a>} />
            {simple("wikidata", "Logos & Wikidata IDs", "Matches by official website (CC0 data).")}
            {simple("linkcheck", "Check websites", "Respects robots.txt; flags dead links.")}
            {simple("programme-links", "Check programme links", "Re-checks official and application links of every programme.")}
            {simple("maintenance", "Expire old confirmations", "Deadlines not re-checked in 150 days go back to “unverified”.")}
          </div>
        </Panel>

        <Panel title="Review queue" description="Imported deadlines that differ from verified ones, and programmes marked for review.">
          <ReviewList />
        </Panel>
      </div>

      <Panel title="Recent jobs" className="mt-3">
        {error && !jobs.length ? <ErrorState error={error} onRetry={reload} /> : loading && !jobs.length ? <p className="text-sm text-mute">Loading…</p> : jobs.length === 0 ? <EmptyState title="No imports yet" hint="Start with the university list." /> : (
          <ul className="divide-y divide-line">
            {jobs.map((j) => <JobRow key={j.id} job={j} busy={busy} onResume={() => drive(j.id)} />)}
          </ul>
        )}
      </Panel>
    </>
  );
}
