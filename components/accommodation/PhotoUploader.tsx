"use client";

import { useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import ListingPhoto from "@/components/ui/ListingPhoto";
import { PHOTO_ACCEPT, shrinkIfLarge } from "@/lib/client-image";
import { ApiError, apiFetch } from "@/lib/api";
import type { ListingImageDto } from "@/lib/marketplace";

const MAX_PHOTOS = 8;

/** Uploads photos to the server one at a time (it validates and converts them), and lets the owner reorder or remove them. The first photo is the cover. */
export default function PhotoUploader({ value, onChange, error, listingId }: { value: ListingImageDto[]; onChange: (v: ListingImageDto[]) => void; error?: string; /** Set when editing: lets an admin upload on the owner's behalf. */ listingId?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [problems, setProblems] = useState<string[]>([]);
  const items = useRef(value);
  const fresh = useRef(new Set<string>()); // uploaded in this session and not yet attached to a saved listing
  items.current = value;

  async function upload(files: File[]) {
    const room = MAX_PHOTOS - items.current.length;
    const chosen = files.slice(0, Math.max(0, room));
    const errs: string[] = files.length > chosen.length ? [`Only ${MAX_PHOTOS} photos fit on a listing.`] : [];
    setBusy((b) => b + chosen.length);
    for (const file of chosen) {
      try {
        const body = new FormData();
        body.append("file", await shrinkIfLarge(file));
        if (listingId) body.append("listingId", listingId);
        const { image } = await apiFetch<{ image: ListingImageDto }>("/api/uploads/listing-images", { method: "POST", body });
        fresh.current.add(image.id);
        items.current = [...items.current, image];
        onChange(items.current);
      } catch (e) {
        errs.push(`${file.name}: ${e instanceof ApiError ? e.message : "upload failed"}`);
      } finally {
        setBusy((b) => b - 1);
      }
    }
    setProblems(errs);
    if (input.current) input.current.value = "";
  }

  async function remove(img: ListingImageDto) {
    onChange(value.filter((v) => v.id !== img.id));
    // Unsaved uploads are deleted right away; photos on a saved listing are only removed when the edit is saved.
    if (fresh.current.delete(img.id)) apiFetch(`/api/uploads/listing-images/${img.id}`, { method: "DELETE" }).catch(() => {});
  }

  const makeCover = (i: number) => onChange([value[i], ...value.filter((_, k) => k !== i)]);

  const move = (i: number, to: number) => {
    const next = [...value];
    [next[i], next[to]] = [next[to], next[i]];
    onChange(next);
  };

  return (
    <div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((img, i) => (
          <li key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-paper-sunk">
            <ListingPhoto image={img} alt={`Photo ${i + 1}`} sizes="(min-width: 640px) 160px, 33vw" />
            {i === 0 ? (
              <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-paper-raised/95 px-2 py-0.5 text-[10px] font-semibold text-ink-900"><Icon name="check" size={10} strokeWidth={3} /> Cover</span>
            ) : (
              <button type="button" onClick={() => makeCover(i)} className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-black/75">Make cover</button>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5">
              <div className="flex gap-1">
                <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Move photo ${i + 1} earlier`} className="grid h-7 w-7 place-items-center rounded-md bg-black/40 text-white disabled:opacity-30">
                  <Icon name="chevronLeft" size={14} />
                </button>
                <button type="button" disabled={i === value.length - 1} onClick={() => move(i, i + 1)} aria-label={`Move photo ${i + 1} later`} className="grid h-7 w-7 place-items-center rounded-md bg-black/40 text-white disabled:opacity-30">
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
              <button type="button" onClick={() => remove(img)} aria-label={`Remove photo ${i + 1}`} className="grid h-7 w-7 place-items-center rounded-md bg-black/40 text-white">
                <Icon name="trash" size={13} />
              </button>
            </div>
          </li>
        ))}
        {Array.from({ length: busy }, (_, i) => (
          <li key={`busy-${i}`} className="grid aspect-square animate-pulse place-items-center rounded-xl border border-dashed border-line-strong bg-paper-sunk text-xs text-mute" role="status">Uploading…</li>
        ))}
        {value.length + busy < MAX_PHOTOS && (
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line-strong bg-paper-raised text-xs font-medium text-ink-700 transition-colors hover:bg-paper-sunk"
            >
              <Icon name="plus" size={20} />
              Add photos
            </button>
          </li>
        )}
      </ul>
      <input ref={input} type="file" multiple accept={PHOTO_ACCEPT} className="sr-only" aria-label="Add photos" onChange={(e) => upload(Array.from(e.target.files ?? []))} />
      <p className="mt-2 text-xs text-mute">JPG, PNG or HEIC, up to 10 MB each, {MAX_PHOTOS} photos max. The cover photo is the one shown on the listing card: tap “Make cover” on the one you want. We resize photos and remove location data.</p>
      {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
      {problems.length > 0 && (
        <ul role="alert" className="mt-1 space-y-0.5 text-xs text-red-700">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
    </div>
  );
}
