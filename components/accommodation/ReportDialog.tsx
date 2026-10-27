"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { Notice } from "@/components/ui/States";
import { ApiError, apiFetch, jsonInit } from "@/lib/api";
import { REPORT_REASON_OPTIONS } from "@/lib/marketplace";

/** Lets anyone flag a listing (scam, wrong details, already rented…). */
export default function ReportDialog({ listingId, open, onClose }: { listingId: string; open: boolean; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    if (!reason) return setError("Choose a reason.");
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/api/listings/${listingId}/report`, jsonInit("POST", { reason, details }));
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't send the report.");
    } finally {
      setBusy(false);
    }
  }

  const close = () => { onClose(); if (done) { setDone(false); setReason(""); setDetails(""); } };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Report this listing"
      size="sm"
      footer={done ? <button type="button" className="btn-primary" onClick={close}>Done</button> : (
        <>
          <button type="button" className="btn-secondary" onClick={close} disabled={busy}>Cancel</button>
          <button type="button" className="btn-primary" onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send report"}</button>
        </>
      )}
    >
      {done ? (
        <Notice tone="success">Thanks. A moderator will review this listing.</Notice>
      ) : (
        <div className="space-y-3">
          <fieldset>
            <legend className="label">What&apos;s wrong?</legend>
            <div className="space-y-1">
              {REPORT_REASON_OPTIONS.map((o) => (
                <label key={o.value} className={`flex min-h-[40px] cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-[13px] ${reason === o.value ? "border-ink-800 bg-paper-sunk" : "border-line"}`}>
                  <input type="radio" name="reason" value={o.value} checked={reason === o.value} onChange={() => setReason(o.value)} className="accent-[rgb(var(--clay-500))]" />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="report-details" className="label">More details (optional)</label>
            <textarea id="report-details" rows={3} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} className="input" />
          </div>
          {error && <Notice tone="error">{error}</Notice>}
        </div>
      )}
    </Modal>
  );
}
