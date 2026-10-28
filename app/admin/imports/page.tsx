"use client";

import { useRef, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Icon, { IconName } from "@/components/ui/Icon";
import { EmptyState, ErrorState, Notice } from "@/components/ui/States";
import { Section, timeAgo } from "@/components/admin/parts";
import { useApi } from "@/hooks/useApi";
import { useJobRunner, type JobDto } from "@/hooks/useJobRunner";
import { apiFetch, jsonInit } from "@/lib/api";
import { fmtDay } from "@/lib/deadline";

// Plain-language names for every kind of job the server can run.
const KIND_LABEL: Record<string, string> = {
  hrk: "German university list", programmes: "Programmes file", wikidata: "Logos & official IDs", linkcheck: "Website check",
  "programme-links": "Programme link check", maintenance: "Expire old confirmations",
};

type ReviewItem = { id: string; name: string; degreeLevel: string; winterDeadline: string | null; summerDeadline: string | null; verification: string; sourceUrl: string | null; pendingChange: any; university: { name: string } };

function statusOf(job: JobDto): { text: string; cls: string } {
  if (job.interrupted) return { text: "Stopped early", cls: "bg-amber-100 text-amber-800" };
  if (job.status === "DONE") return { text: "Finished", cls: "bg-green-100 text-green-800" };
  if (job.status === "FAILED") return { text: "Failed", cls: "bg-red-100 text-red-800" };
  if (job.status === "RUNNING") return { text: "Running", cls: "bg-clay-100 text-clay-600" };
  return { text: "Waiting", cls: "bg-slate-100 text-slate-700" };
}

function Summary({ job }: { job: JobDto }) {
  const parts = [
    job.created ? `${job.created} added` : "",
    job.updated ? `${job.updated} updated` : "",
    job.skipped ? `${job.skipped} already up to date` : "",
    job.failed ? `${job.failed} had problems` : "",
  ].filter(Boolean);
  return <>{parts.length ? parts.join(" · ") : job.status === "DONE" ? "Nothing needed changing." : "Starting…"}</>;
}

function HistoryRow({ job, busy, onResume }: { job: JobDto; busy: boolean; onResume: () => void }) {
  const [open, setOpen] = useState(false);
  const st = statusOf(job);
  const pct = job.total ? Math.round((job.processed / job.total) * 100) : job.status === "DONE" ? 100 : 0;
  const unfinished = job.interrupted || job.status === "QUEUED";
  return (
    <li className="px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-[13px] font-semibold">{KIND_LABEL[job.kind] ?? job.kind}</span>
        <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.text}</span>
        <span className="text-xs text-mute">{timeAgo(job.createdAt)}</span>
        {unfinished && !busy && <button type="button" onClick={onResume} className="btn-secondary !min-h-[34px] ml-auto !px-3 text-xs">Continue</button>}
      </div>
      {job.status !== "DONE" && job.status !== "FAILED" && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-sunk" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress"><div className="h-full rounded-full bg-clay-500" style={{ width: `${pct}%` }} /></div>
      )}
      <p className="mt-1.5 text-xs text-mute"><Summary job={job} /></p>
      {job.error && <p className="mt-1 text-xs text-red-700">{job.error}</p>}
      {job.log.length > 0 && (
        <>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-1 text-xs font-medium text-clay-600 hover:underline">{open ? "Hide details" : "Show details"}</button>
          {open && <pre className="mt-1 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-paper-sunk p-2.5 text-[11px] leading-relaxed">{job.log.join("\n")}</pre>}
        </>
      )}
    </li>
  );
}

/** One thing the admin can do: what it is, when to use it, and a single button. */
function Task({ icon, title, what, when, children }: { icon: IconName; title: string; what: string; when: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-paper-sunk text-ink-700"><Icon name={icon} size={18} /></span>
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold leading-snug">{title}</h3>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-700">{what}</p>
        </div>
      </div>
      <p className="text-xs text-mute"><span className="font-semibold text-ink-700">When to use: </span>{when}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function FileButton({ label, accept, disabled, onFile }: { label: string; accept: string; disabled: boolean; onFile: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={input} type="file" accept={accept} className="sr-only" aria-label={label} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); if (input.current) input.current.value = ""; }} />
      <button type="button" disabled={disabled} onClick={() => input.current?.click()} className="btn-primary"><Icon name="upload" size={14} /> {label}</button>
    </>
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
  if (!loading && items.length === 0) return <EmptyState title="Nothing to double-check" hint="If an update disagrees with a deadline you already confirmed, it will wait here for your decision." />;
  return (
    <ul className="divide-y divide-line">
      {err && <li className="px-4 py-2"><Notice tone="error">{err}</Notice></li>}
      {items.map((p) => (
        <li key={p.id} className="space-y-2 px-4 py-3.5">
          <p className="text-[13px] font-semibold">{p.university.name} <span className="font-normal text-mute">· {p.name}</span></p>
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-lg bg-paper p-2.5"><p className="font-semibold text-ink-700">Saved now</p><p className="mt-0.5 text-mute">Winter {fmtDay(p.winterDeadline)} · Summer {fmtDay(p.summerDeadline)}</p></div>
            {p.pendingChange && (
              <div className="rounded-lg bg-clay-50 p-2.5"><p className="font-semibold text-clay-600">New from update</p><p className="mt-0.5 text-ink-700">Winter {p.pendingChange.winterDeadline ? fmtDay(p.pendingChange.winterDeadline) : "—"} · Summer {p.pendingChange.summerDeadline ? fmtDay(p.pendingChange.summerDeadline) : "—"}{p.pendingChange.sourceUrl && <> · <a className="text-clay-600 hover:underline" href={p.pendingChange.sourceUrl} target="_blank" rel="noopener noreferrer">see source</a></>}</p></div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {p.pendingChange && <button type="button" className="btn-primary !min-h-[36px] text-xs" onClick={() => act(p.id, "accept")}>Use the new dates</button>}
            <button type="button" className="btn-secondary !min-h-[36px] text-xs" onClick={() => act(p.id, p.pendingChange ? "reject" : "verify")}>{p.pendingChange ? "Keep what we have" : "Mark as confirmed"}</button>
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
  const running = jobs.find((j) => j.id === activeId);

  async function start(kind: string, file?: File) {
    setStartError("");
    try {
      const body = new FormData();
      body.append("kind", kind);
      if (file) body.append("file", file);
      const { id } = await apiFetch<{ id: string }>("/api/admin/imports", { method: "POST", body });
      drive(id);
    } catch (e: any) {
      setStartError(e?.message || "Couldn't start. Please try again.");
    }
  }
  const run = (kind: string) => <button type="button" disabled={busy} onClick={() => start(kind)} className="btn-secondary">Run now</button>;

  return (
    <>
      <PageHeader title="Update data" description="Keep the universities and programmes lists complete and correct. Nothing here changes applicants or listings." />
      {(startError || runError) && <div className="mb-3"><Notice tone="error">{startError || runError}</Notice></div>}

      {busy && (
        <div className="card mb-4 border-l-4 border-l-clay-500 p-4" role="status">
          <p className="flex items-center gap-2 text-[13px] font-semibold"><span className="h-2 w-2 animate-pulse rounded-full bg-clay-500" /> Working… {running ? `${KIND_LABEL[running.kind] ?? "Update"}: ${running.processed} of ${running.total || "?"}` : ""}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-sunk"><div className="h-full rounded-full bg-clay-500 transition-all" style={{ width: `${running?.total ? Math.round((running.processed / running.total) * 100) : 8}%` }} /></div>
          <p className="mt-2 text-xs text-mute">Please keep this page open until it finishes. If you close it by accident, come back and press Continue below.</p>
        </div>
      )}

      <div className="space-y-5">
        <section aria-labelledby="add-title">
          <h2 id="add-title" className="mb-2 text-xs font-semibold uppercase tracking-wider text-mute">Add or update information from a file</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Task icon="school" title="German university list" what="Adds or updates universities from the official Hochschulkompass export." when="Once at the start, then now and then to pick up new universities. Safe to repeat: nothing is duplicated.">
              <FileButton label="Choose university file" accept=".tsv,.csv,.txt" disabled={busy} onFile={(f) => start("hrk", f)} />
            </Task>
            <Task icon="book" title="Programmes and deadlines" what="Adds courses and application deadlines from a spreadsheet (CSV or Excel)." when="When you have researched new programmes. Start from our template so the columns are right.">
              <FileButton label="Choose spreadsheet" accept=".csv,.xlsx" disabled={busy} onFile={(f) => start("programmes", f)} />
              <a href="/api/admin/imports/template" className="text-xs font-semibold text-clay-600 hover:underline">Download template</a>
            </Task>
          </div>
        </section>

        <section aria-labelledby="auto-title">
          <h2 id="auto-title" className="mb-2 text-xs font-semibold uppercase tracking-wider text-mute">Automatic checks</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Task icon="image" title="Add logos" what="Finds a logo and official ID for each university." when="After adding new universities.">{run("wikidata")}</Task>
            <Task icon="external" title="Check websites" what="Looks for university websites that no longer work." when="Every month or two.">{run("linkcheck")}</Task>
            <Task icon="file" title="Check programme links" what="Tests every programme page and application link." when="Before a new intake opens.">{run("programme-links")}</Task>
            <Task icon="clock" title="Expire old confirmations" what="Deadlines not re-checked for 150 days become “unconfirmed”." when="Now and then, to keep deadlines honest.">{run("maintenance")}</Task>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
          <Section flush title="Deadlines to double-check" hint="Updates that disagree with dates you already confirmed">
            <ReviewList />
          </Section>
          <Section flush title="History" hint="What ran recently and what it did">
            {error && !jobs.length ? <ErrorState error={error} onRetry={reload} /> : loading && !jobs.length ? <p className="p-4 text-sm text-mute">Loading…</p> : jobs.length === 0 ? <EmptyState title="Nothing has run yet" hint="Start with the university list above." /> : (
              <ul className="divide-y divide-line">{jobs.map((j) => <HistoryRow key={j.id} job={j} busy={busy} onResume={() => drive(j.id)} />)}</ul>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
