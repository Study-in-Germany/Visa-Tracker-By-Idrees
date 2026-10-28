"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import Icon from "@/components/ui/Icon";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import UniversityCard from "@/components/universities/UniversityCard";
import UniversityFormModal from "@/components/universities/UniversityFormModal";
import ProgrammeFormModal from "@/components/universities/ProgrammeFormModal";
import { invalidateApi, useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/api";
import type { Paged, ProgrammeDto, UniversityDto } from "@/lib/marketplace";

const iconBtn = "grid h-9 w-9 place-items-center rounded-lg border border-line-strong text-ink-700 hover:bg-paper-sunk";
const miniBtn = "grid h-8 w-8 place-items-center rounded-md border border-line-strong text-ink-700 hover:bg-paper-sunk";

type Target = { kind: "uni"; u: UniversityDto } | { kind: "programme"; p: ProgrammeDto };

function UniversitiesInner() {
  const q = useSearchParams().get("q") ?? "";
  const [page, setPage] = useState(1);
  const [lastQ, setLastQ] = useState(q);
  if (lastQ !== q) { setLastQ(q); setPage(1); }
  const params = new URLSearchParams({ includeUnpublished: "1", page: String(page), pageSize: "12" });
  if (q) params.set("q", q);
  const { data, error, loading, reload } = useApi<Paged<UniversityDto>>(`/api/universities?${params}`);

  const [uniForm, setUniForm] = useState<{ open: boolean; u: UniversityDto | null }>({ open: false, u: null });
  const [progForm, setProgForm] = useState<{ open: boolean; universityId: string; p: ProgrammeDto | null }>({ open: false, universityId: "", p: null });
  const [del, setDel] = useState<Target | null>(null);

  const refresh = () => { invalidateApi("/api/universities"); reload(); };
  const items = data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Universities"
        actions={<button type="button" className="btn-primary" onClick={() => setUniForm({ open: true, u: null })}><Icon name="plus" size={14} /> Add university</button>}
      />

      {error && items.length === 0 ? (
        <div className="card"><ErrorState error={error} onRetry={reload} /></div>
      ) : loading && items.length === 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="card"><EmptyState title={q ? "No universities match" : "No universities yet"} hint={q ? undefined : "Add the first one to start the directory."} /></div>
      ) : (
        <div className={loading ? "opacity-60" : ""}>
          <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((u) => (
              <UniversityCard
                key={u.id}
                u={u}
                actions={
                  <>
                    <button type="button" className={iconBtn} aria-label={`Add programme to ${u.name}`} title="Add programme" onClick={() => setProgForm({ open: true, universityId: u.id, p: null })}><Icon name="plus" size={15} /></button>
                    <button type="button" className={iconBtn} aria-label={`Edit ${u.name}`} title="Edit" onClick={() => setUniForm({ open: true, u })}><Icon name="edit" size={15} /></button>
                    <button type="button" className={iconBtn} aria-label={`Delete ${u.name}`} title="Delete" onClick={() => setDel({ kind: "uni", u })}><Icon name="trash" size={15} /></button>
                  </>
                }
                programmeActions={(p) => (
                  <>
                    <button type="button" className={miniBtn} aria-label={`Edit ${p.name}`} onClick={() => setProgForm({ open: true, universityId: u.id, p })}><Icon name="edit" size={13} /></button>
                    <button type="button" className={miniBtn} aria-label={`Delete ${p.name}`} onClick={() => setDel({ kind: "programme", p })}><Icon name="trash" size={13} /></button>
                  </>
                )}
              />
            ))}
          </div>
          <Pagination className="mt-4" page={data?.page ?? 1} pageCount={data?.pageCount ?? 1} total={data?.count} noun="universities" onPage={setPage} />
        </div>
      )}

      <UniversityFormModal open={uniForm.open} university={uniForm.u} onClose={() => setUniForm((s) => ({ ...s, open: false }))} onSaved={refresh} />
      <ProgrammeFormModal open={progForm.open} universityId={progForm.universityId} programme={progForm.p} onClose={() => setProgForm((s) => ({ ...s, open: false }))} onSaved={refresh} />
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        title={del?.kind === "uni" ? "Delete university?" : "Delete programme?"}
        message={del?.kind === "uni" ? `“${del.u.name}” and all ${del.u.programmes.length} of its programmes will be removed.` : del ? `“${del.p.name}” will be removed.` : ""}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!del) return;
          await apiFetch(del.kind === "uni" ? `/api/universities/${del.u.id}` : `/api/programmes/${del.p.id}`, { method: "DELETE" });
          refresh();
        }}
      />
    </>
  );
}

export default function AdminUniversitiesPage() {
  return <Suspense><UniversitiesInner /></Suspense>;
}
