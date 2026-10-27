"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Notice } from "@/components/ui/States";
import { apiFetch, jsonInit } from "@/lib/api";
import { invalidateApi } from "@/hooks/useApi";

/** Edit, mark as rented / reopen, and delete, for a listing's owner (and admins). `onChanged` runs after a successful change. */
export default function OwnerActions({
  id, status, kind = "OFFERING", onChanged, onDeleted, compact = false,
}: {
  id: string;
  status: string;
  kind?: string;
  onChanged: () => void;
  onDeleted: () => void;
  compact?: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggleRented() {
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/api/listings/${id}`, jsonInit("PATCH", { action: status === "RENTED" ? "reopen" : "markRented" }));
      invalidateApi("/api/listings");
      onChanged();
    } catch (e: any) {
      setError(e?.message || "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  const size = compact ? "!min-h-[36px] !px-3 text-xs" : "";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Link href={`/accommodation/${id}/edit`} className={`btn-secondary ${size}`}><Icon name="edit" size={13} /> Edit</Link>
        {(status === "APPROVED" || status === "RENTED") && (
          <button type="button" onClick={toggleRented} disabled={busy} className={`btn-secondary ${size}`}>
            <Icon name={status === "RENTED" ? "arrowUp" : "key"} size={13} /> {status === "RENTED" ? "Mark available" : kind === "SEEKING" ? "Found a place" : "Mark as rented"}
          </button>
        )}
        <button type="button" onClick={() => setConfirm(true)} className={`btn-danger ${size}`}><Icon name="trash" size={13} /> Delete</button>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete this listing?"
        message="The listing and its photos will be removed permanently. This can't be undone."
        confirmLabel="Delete listing"
        onConfirm={async () => {
          await apiFetch(`/api/listings/${id}`, { method: "DELETE" });
          invalidateApi("/api/listings");
          onDeleted();
        }}
      />
    </div>
  );
}
