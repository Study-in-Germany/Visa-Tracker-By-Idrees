"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import FormModal from "@/components/ui/FormModal";
import Field from "@/components/ui/Field";
import { Notice } from "@/components/ui/States";
import { apiFetch, jsonInit } from "@/lib/api";
import { invalidateApi } from "@/hooks/useApi";

/** Approve / reject (with a reason shown to the owner) / send back to review. Admin only. */
export default function ModerationActions({ id, status, onChanged }: { id: string; status: string; onChanged: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function moderate(next: "APPROVED" | "PENDING_REVIEW") {
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/api/admin/listings/${id}`, jsonInit("PATCH", { status: next }));
      invalidateApi("/api/listings");
      onChanged();
    } catch (e: any) {
      setError(e?.message || "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  const btn = "btn-secondary !min-h-[36px] !px-3 text-xs";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status !== "APPROVED" && status !== "RENTED" && <button type="button" disabled={busy} onClick={() => moderate("APPROVED")} className="btn-primary !min-h-[36px] !px-3 text-xs"><Icon name="check" size={13} /> Approve</button>}
        {status !== "REJECTED" && <button type="button" disabled={busy} onClick={() => { setReason(""); setRejecting(true); }} className="btn-danger !min-h-[36px] !px-3 text-xs"><Icon name="close" size={13} /> Reject</button>}
        {status === "APPROVED" && <button type="button" disabled={busy} onClick={() => moderate("PENDING_REVIEW")} className={btn}>Unpublish</button>}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <FormModal
        open={rejecting}
        onClose={() => setRejecting(false)}
        title="Reject listing"
        submitLabel="Reject listing"
        size="sm"
        onSubmit={async () => {
          await apiFetch(`/api/admin/listings/${id}`, jsonInit("PATCH", { status: "REJECTED", rejectionReason: reason }));
          invalidateApi("/api/listings");
          onChanged();
        }}
      >
        {({ errors }) => (
          <Field label="Reason (shown to the owner)" htmlFor="reject-reason" required error={errors.rejectionReason}>
            <textarea id="reject-reason" className="input" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Photos don't show the actual room" />
          </Field>
        )}
      </FormModal>
    </div>
  );
}
