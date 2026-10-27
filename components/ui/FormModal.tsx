"use client";

import { useState } from "react";
import Modal from "./Modal";
import { Notice } from "./States";
import { ApiError } from "@/lib/api";

/**
 * Modal wrapper for create/edit forms. Children render inside a <form>; `onSubmit` may throw an ApiError,
 * whose message and per-field errors are passed back through `errors` / shown at the bottom.
 */
export default function FormModal({
  open, onClose, title, submitLabel = "Save", onSubmit, children, size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  submitLabel?: string;
  onSubmit: () => Promise<void>;
  children: (ctx: { errors: Record<string, string> }) => React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setErrors({});
    try {
      await onSubmit();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0]])));
        setError("Please fix the highlighted fields.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={title}
      size={size}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form="form-modal" className="btn-primary" disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
        </>
      }
    >
      <form id="form-modal" onSubmit={submit} noValidate className="space-y-4">
        {children({ errors })}
        {error && <Notice tone="error">{error}</Notice>}
      </form>
    </Modal>
  );
}
