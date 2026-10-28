"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import FileDrop from "@/components/ui/FileDrop";
import Icon from "@/components/ui/Icon";
import { Notice } from "@/components/ui/States";
import { Section } from "@/components/admin/parts";
import { invalidateApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/api";

type Result = { createdCount: number; skippedCount: number; results: { row: number; status: string; publicId?: string; reason?: string }[] };

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-800 text-[13px] font-semibold text-paper-raised" aria-hidden="true">{n}</span>
      <div className="min-w-0 flex-1 pb-1">
        <h3 className="text-[14px] font-semibold leading-7">{title}</h3>
        <div className="text-[13px] text-ink-700">{children}</div>
      </div>
    </li>
  );
}

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError("");
    setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      setResult(await apiFetch<Result>("/api/admin/import-applicants", { method: "POST", body: formData }));
      invalidateApi("/api/applicants");
      invalidateApi("/api/admin/overview");
      setFile(null);
    } catch (err: any) {
      setError(err.message || "The upload didn't work. Check the file and try again.");
    } finally {
      setUploading(false);
    }
  }

  const skipped = result?.results.filter((r) => r.status !== "created") ?? [];

  return (
    <>
      <PageHeader title="Import applicants" description="Add many applicants at once from a spreadsheet instead of typing them one by one." />

      <div className="grid items-start gap-5 xl:grid-cols-5">
        <Section className="xl:col-span-3" title="Three easy steps">
          <ol className="space-y-5">
            <Step n={1} title="Download the template">
              <p>It&apos;s a spreadsheet with the right column names and two example rows. Open it in Excel or Google Sheets.</p>
              <a href="/import-template.csv" download className="btn-secondary mt-2.5"><Icon name="arrowDown" size={14} /> Download template</a>
            </Step>
            <Step n={2} title="Fill in one applicant per row">
              <p>Delete the two example rows and add your own. Only <strong>Name</strong> and <strong>Consulate</strong> (Islamabad or Karachi) are required. Write dates like <span className="font-mono text-xs">2026-03-15</span>. Save it as a <strong>CSV</strong> file.</p>
            </Step>
            <Step n={3} title="Upload the file">
              <form onSubmit={handleUpload} className="mt-2.5 space-y-3">
                <FileDrop accept=".csv" file={file} onFile={(f) => { setFile(f); setError(""); }} label="Choose CSV file" />
                {error && <Notice tone="error">{error}</Notice>}
                <button className="btn-gold w-full sm:w-auto" disabled={uploading || !file}>{uploading ? "Importing…" : "Import applicants"}</button>
              </form>
            </Step>
          </ol>
        </Section>

        <div className="space-y-5 xl:col-span-2">
          {result ? (
            <Section flush title="Import finished">
              <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
                <div className="p-4"><p className="text-[26px] font-bold leading-none text-green-700">{result.createdCount}</p><p className="mt-1 text-xs text-mute">added and approved</p></div>
                <div className="p-4"><p className={`text-[26px] font-bold leading-none ${result.skippedCount ? "text-amber-700" : ""}`}>{result.skippedCount}</p><p className="mt-1 text-xs text-mute">skipped</p></div>
              </div>
              {skipped.length > 0 ? (
                <div className="p-4">
                  <p className="mb-2 text-xs font-semibold text-ink-700">Rows that were skipped, and why</p>
                  <ul className="max-h-72 space-y-1.5 overflow-y-auto text-[13px]">
                    {skipped.map((r) => <li key={r.row} className="rounded-lg bg-amber-50 px-3 py-2"><span className="font-semibold">Row {r.row}:</span> {r.reason}</li>)}
                  </ul>
                  <p className="mt-3 text-xs text-mute">Fix those rows and upload only them again, so the ones already added aren&apos;t repeated.</p>
                </div>
              ) : (
                <p className="flex items-center gap-2 p-4 text-sm text-green-700"><Icon name="checkCircle" size={16} /> Every row was added.</p>
              )}
              <div className="border-t border-line p-3"><Link href="/admin/applicants" className="btn-secondary w-full">View applicants</Link></div>
            </Section>
          ) : (
            <Section title="Good to know">
              <ul className="space-y-2.5 text-[13px] text-ink-700">
                <li className="flex gap-2"><Icon name="check" size={14} className="mt-0.5 shrink-0 text-green-600" /> Every imported applicant is approved straight away and appears on the public tracker.</li>
                <li className="flex gap-2"><Icon name="check" size={14} className="mt-0.5 shrink-0 text-green-600" /> A row with a problem is skipped. The others still go in, and you&apos;ll see why.</li>
                <li className="flex gap-2"><Icon name="check" size={14} className="mt-0.5 shrink-0 text-green-600" /> Adding just one person? Use <strong>Add applicant</strong> on the Applicants page.</li>
              </ul>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
