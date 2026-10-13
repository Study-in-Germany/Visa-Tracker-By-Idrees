"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import StatusBadge from "@/components/StatusBadge";
import { useApi } from "@/hooks/useApi";
import { fmtDate } from "@/lib/format";

export default function MyUpdatesPage() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<{ applicant: any }>("/api/applicant/me");

  useEffect(() => {
    if (error?.status === 401) router.push("/login");
  }, [error, router]);

  if (loading && !data) return <LoadingBlock />;
  if (error) return <div className="card"><ErrorState error={error} onRetry={reload} /></div>;
  const history: any[] = data?.applicant?.history ?? [];

  return (
    <>
      <PageHeader eyebrow="My entry" title="Status history" />
      <Panel>
        {history.length === 0 ? (
          <EmptyState title="No updates yet" hint="Changes to your visa status will be listed here." />
        ) : (
          <ul className="divide-y divide-line">
            {[...history].reverse().map((h) => (
              <li key={h.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <StatusBadge status={h.visaStatus} />
                  {h.note && <p className="mt-1 text-sm text-ink-700">{h.note}</p>}
                </div>
                <span className="text-sm text-ink-600">{fmtDate(h.occurredAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
