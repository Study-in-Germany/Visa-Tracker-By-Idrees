"use client";

import { useState } from "react";
import DatePicker from "@/components/ui/DatePicker";
import Select from "@/components/ui/Select";
import Icon from "@/components/ui/Icon";
import { Notice } from "@/components/ui/States";
import { apiFetch, jsonInit } from "@/lib/api";
import { toDateInput } from "@/lib/deadline";

const OUTCOME_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "VISA_ISSUED", label: "Visa Issued" },
  { value: "VISA_REJECTED", label: "Visa Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

/** Inline editor for one journey milestone: pick or clear a date, add an optional note, and log in history. */
export default function MilestoneEditor({
  milestone,
  label,
  date,
  currentStatus,
  triggerLabel,
  onSaved,
}: {
  milestone: string;
  label: string;
  date: string | null;
  currentStatus?: string;
  triggerLabel?: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(toDateInput(date));
  const [outcome, setOutcome] = useState(
    currentStatus === "VISA_ISSUED" || currentStatus === "VISA_REJECTED" || currentStatus === "WITHDRAWN"
      ? currentStatus
      : "",
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      await apiFetch(
        "/api/applicant/me/milestones",
        jsonInit("PATCH", {
          milestone,
          date: value || null,
          note,
          ...(milestone === "decisionDate" && value && outcome ? { outcome } : {}),
        }),
      );
      setOpen(false);
      setNote("");
      onSaved();
    } catch (e: any) {
      setError(e?.message || "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    if (triggerLabel) {
      return (
        <button
          type="button"
          onClick={() => {
            setValue(toDateInput(date));
            setOpen(true);
          }}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          {triggerLabel}
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => {
          setValue(toDateInput(date));
          setOpen(true);
        }}
        aria-label={`Edit ${label} date`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-mute hover:bg-paper-sunk hover:text-ink-900"
      >
        <Icon name="edit" size={14} />
      </button>
    );
  }

  return (
    <div className="mt-2 w-full space-y-2 rounded-md border border-line bg-paper-raised p-2.5">
      <DatePicker label={label} value={value} onChange={setValue} />
      {milestone === "decisionDate" && value && (
        <Select
          label="Decision outcome"
          value={outcome}
          onChange={setOutcome}
          options={OUTCOME_OPTIONS}
        />
      )}
      <input
        className="input"
        value={note}
        maxLength={300}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional), e.g. “email from embassy”"
        aria-label="Note"
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <button type="button" className="btn-primary !min-h-[34px] flex-1" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn-secondary !min-h-[34px]" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
