"use client";

import { useState } from "react";

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

    const res = await fetch("/api/admin/import-applicants", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setError(data.error || "Import failed.");
      return;
    }
    setResult(data);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card p-6">
        <h3 className="font-bold text-navy-950 mb-2">Import Applicants from CSV</h3>
        <p className="text-sm text-gray-600 mb-4">
          Bulk-add applicants from a spreadsheet. Each row becomes an approved applicant record —
          review them afterward under Applicants if needed.
        </p>
        <a href="/import-template.csv" download className="text-sm text-navy-700 hover:underline font-medium">
          ⬇ Download CSV template
        </a>

        <form onSubmit={handleUpload} className="mt-5 space-y-4">
          <div>
            <label className="label">CSV File</label>
            <input
              type="file"
              accept=".csv"
              className="input"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-gold" disabled={uploading || !file}>
            {uploading ? "Importing…" : "Import"}
          </button>
        </form>
      </div>

      {result && (
        <div className="card p-6">
          <h3 className="font-bold text-navy-950 mb-2">Import Results</h3>
          <p className="text-sm text-gray-700 mb-4">
            <span className="text-emerald-600 font-semibold">{result.createdCount} created</span>
            {" · "}
            <span className="text-amber-600 font-semibold">{result.skippedCount} skipped</span>
          </p>
          <div className="max-h-80 overflow-y-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Row</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.results.map((r: any) => (
                  <tr key={r.row}>
                    <td className="px-3 py-2">{r.row}</td>
                    <td className="px-3 py-2">
                      {r.status === "created" ? (
                        <span className="text-emerald-600">Created</span>
                      ) : (
                        <span className="text-amber-600">Skipped</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono">{r.publicId || r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
