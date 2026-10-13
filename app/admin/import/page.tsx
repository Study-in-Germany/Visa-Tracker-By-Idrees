"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import FileDrop from "@/components/ui/FileDrop";
import Icon from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import { Notice } from "@/components/ui/States";
import { apiFetch } from "@/lib/api";

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
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
      setResult(await apiFetch("/api/admin/import-applicants", { method: "POST", body: formData }));
    } catch (err: any) {
      setError(err.message || "Import failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <PageHeader title="Import" description="Bulk-add applicants from a CSV. Each row becomes an approved record." />
      <div className="grid items-start gap-3 lg:grid-cols-2">
        <Panel title="Upload CSV" actions={<a href="/import-template.csv" download className="inline-flex items-center gap-1 text-xs font-medium text-clay-600 hover:underline"><Icon name="arrowDown" size={12} /> Template</a>}>
          <form onSubmit={handleUpload} className="space-y-3">
            <FileDrop accept=".csv" file={file} onFile={setFile} label="Choose CSV" />
            {error && <Notice tone="error">{error}</Notice>}
            <button className="btn-gold" disabled={uploading || !file}>{uploading ? "Importing…" : "Import"}</button>
          </form>
        </Panel>

        {result && (
          <Panel title="Results" description={`${result.createdCount} created · ${result.skippedCount} skipped`}>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-line">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-paper-sunk text-left text-[11px] uppercase tracking-wider text-mute">
                  <tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Detail</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {result.results.map((r: any) => (
                    <tr key={r.row}>
                      <td className="px-3 py-1.5">{r.row}</td>
                      <td className="px-3 py-1.5"><Chip tone={r.status === "created" ? "good" : "warn"}>{r.status === "created" ? "Created" : "Skipped"}</Chip></td>
                      <td className="px-3 py-1.5 font-mono text-xs">{r.publicId || r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}
