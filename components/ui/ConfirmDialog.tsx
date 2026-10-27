"use client";

import { useState } from "react";
import Modal from "./Modal";
import { Notice } from "./States";

/** Confirmation for destructive or hard-to-undo actions. `onConfirm` may throw; its message is shown inline. */
export default function ConfirmDialog({
  open, onClose, title, message, confirmLabel, tone = "danger", onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  onConfirm: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (e: any) {
      setError(e?.message || "That didn't work. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={tone === "danger" ? "btn-danger" : "btn-primary"} onClick={run} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-[13px] text-ink-700">
        <div>{message}</div>
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    </Modal>
  );
}
