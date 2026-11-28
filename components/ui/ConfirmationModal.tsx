"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon, { type IconName } from "./Icon";
import Button from "./Button";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "info" | "success" | "warning";
  icon?: IconName;
  isLoading?: boolean;
  error?: string | null;
}

const STYLES = {
  danger: {
    icon: "alert" as IconName,
    iconWrap: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400",
    buttonVariant: "danger" as const,
  },
  info: {
    icon: "info" as IconName,
    iconWrap: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    buttonVariant: "primary" as const,
  },
  success: {
    icon: "checkCircle" as IconName,
    iconWrap: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    buttonVariant: "success" as const,
  },
  warning: {
    icon: "alert" as IconName,
    iconWrap: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
    buttonVariant: "warning" as const,
  },
};

/**
 * Confirmation modal matching the Valley ConfirmationModal design:
 * centered compact dialog, icon badge, title, description, and equal-width Cancel / Confirm actions.
 */
export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info",
  icon,
  isLoading = false,
  error,
}: ConfirmationModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || !mounted) return null;

  const s = STYLES[variant];

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => !isLoading && onClose()}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-xl border border-line bg-paper-raised shadow-lg animate-[sheet-up_150ms_ease-out]">
        <button
          type="button"
          onClick={() => !isLoading && onClose()}
          disabled={isLoading}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-mute transition-colors hover:bg-paper-sunk hover:text-ink-900 disabled:opacity-50"
        >
          <Icon name="close" size={16} />
        </button>

        <div className="flex flex-col items-center p-5 pb-4 text-center">
          <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full ${s.iconWrap}`}>
            <Icon name={icon ?? s.icon} size={20} />
          </div>
          <h3 id="confirm-modal-title" className="mb-1.5 text-lg font-semibold text-ink-900">
            {title}
          </h3>
          <p className="text-sm leading-relaxed text-ink-600">{message}</p>
          {error && (
            <p role="alert" className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 p-5 pt-0">
          <Button
            variant="secondary"
            size="sm"
            className="min-h-[40px] flex-1 font-medium"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={s.buttonVariant}
            size="sm"
            className="min-h-[40px] flex-1 font-medium"
            onClick={onConfirm}
            loading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
