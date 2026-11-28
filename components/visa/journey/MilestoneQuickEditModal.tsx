"use client";

import { useEffect, useState } from "react";
import DatePicker from "@/components/ui/DatePicker";
import Modal from "@/components/ui/Modal";
import { Notice } from "@/components/ui/States";
import { apiFetch, jsonInit } from "@/lib/api";
import { toDateInput } from "@/lib/deadline";

export default function MilestoneQuickEditModal({
  open,
  onClose,
  milestone,
  label,
  initialDate,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  milestone: string;
  label: string;
  initialDate: string | null;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(toDateInput(initialDate));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setValue(toDateInput(initialDate));
      setError("");
    }
  }, [open, initialDate, milestone]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiFetch(
        "/api/applicant/me/milestones",
        jsonInit("PATCH", { milestone, date: value || null, note })
      );
      setNote("");
      onClose();
      onSaved();
    } catch (err: any) {
      setError(err?.message || "Couldn't save milestone date.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Update ${label.toLowerCase()}`} size="sm">
      <form onSubmit={save} className="space-y-3">
        <DatePicker label={label} value={value} onChange={setValue} />
        <div>
          <label htmlFor="quick-milestone-note" className="label">
            Note (optional)
          </label>
          <input
            id="quick-milestone-note"
            className="input"
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Confirmed via Consular Portal"
          />
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="btn-secondary min-h-[40px] sm:min-h-[36px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn-primary min-h-[40px] sm:min-h-[36px]"
          >
            {busy ? "Saving…" : "Save date"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
