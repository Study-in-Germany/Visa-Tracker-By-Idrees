import Icon from "./Icon";
import type { ApiError } from "@/lib/api";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-paper-sunk ${className}`} aria-hidden="true" />;
}

export function LoadingBlock({ label = "Loading", rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3 py-2">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-paper-sunk text-ink-600">
        <Icon name="inbox" />
      </span>
      <p className="font-medium text-ink-800">{title}</p>
      {hint && <p className="max-w-sm text-sm text-ink-600">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError | Error | string; onRetry?: () => void }) {
  const message = typeof error === "string" ? error : error.message;
  return (
    <div role="alert" className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-700">
        <Icon name="alert" />
      </span>
      <p className="font-medium text-ink-800">We couldn&apos;t load this</p>
      <p className="max-w-sm text-sm text-ink-600">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-1">
          Try again
        </button>
      )}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "error"; children: React.ReactNode }) {
  const styles = {
    info: "border-line-strong bg-paper-sunk text-ink-800",
    success: "border-emerald-300 bg-emerald-50 text-emerald-900",
    error: "border-red-300 bg-red-50 text-red-900",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-md border px-3 py-2 text-sm ${styles}`}>
      {children}
    </div>
  );
}
