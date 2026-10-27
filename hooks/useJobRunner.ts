"use client";

import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

export type JobDto = {
  id: string; kind: string; status: "QUEUED" | "RUNNING" | "DONE" | "FAILED"; total: number; processed: number;
  created: number; updated: number; skipped: number; failed: number; error: string | null; log: string[];
  createdAt: string; updatedAt: string; finishedAt: string | null; interrupted?: boolean;
};

/**
 * Drives a server-side import job to completion by calling its /run endpoint repeatedly (each call does a few seconds of work).
 * Because progress lives in the database, calling `drive` again on an interrupted job simply resumes it.
 */
export function useJobRunner(onTick: () => void) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const stop = useRef(false);

  const drive = useCallback(async (id: string) => {
    setActiveId(id);
    setError("");
    stop.current = false;
    try {
      for (;;) {
        const { job } = await apiFetch<{ job: JobDto }>(`/api/admin/imports/${id}/run`, { method: "POST" });
        onTick();
        if (job.status === "DONE" || job.status === "FAILED" || stop.current) break;
      }
    } catch (e: any) {
      setError(e?.message || "The import stopped. Use Resume to continue.");
    } finally {
      setActiveId(null);
      onTick();
    }
  }, [onTick]);

  return { activeId, error, drive, cancel: () => { stop.current = true; } };
}
