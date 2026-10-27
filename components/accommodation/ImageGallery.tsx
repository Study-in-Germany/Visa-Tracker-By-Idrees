"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/Icon";
import ListingPhoto from "@/components/ui/ListingPhoto";
import type { ListingImageDto } from "@/lib/marketplace";

/** Full-screen viewer with arrow keys, swipe and Escape. */
export function Lightbox({ images, start, title, onClose }: { images: ListingImageDto[]; start: number; title: string; onClose: () => void }) {
  const [i, setI] = useState(start);
  const touch = useRef<number | null>(null);
  const go = useCallback((d: number) => setI((n) => (n + d + images.length) % images.length), [images.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [go, onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} photos`}
      className="fixed inset-0 z-[95] flex flex-col bg-black/95"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm tabular-nums">{i + 1} / {images.length}</span>
        <button type="button" onClick={onClose} aria-label="Close photos" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Icon name="close" /></button>
      </div>
      <div className="relative min-h-0 flex-1">
        <ListingPhoto key={images[i].id} image={images[i]} alt={`${title}, photo ${i + 1}`} sizes="100vw" priority className="object-contain" />
      </div>
      {images.length > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><Icon name="chevronLeft" /></button>
          <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><Icon name="chevronRight" /></button>
        </>
      )}
      <div className="h-6" />
    </div>,
    document.body,
  );
}

/** Swipeable photo carousel with a thumbnail strip. Tapping the main photo opens the full-screen viewer. */
export default function ImageGallery({ images, title }: { images: ListingImageDto[]; title: string }) {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const touch = useRef<number | null>(null);
  const n = images.length;
  const go = (d: number) => setI((c) => (c + d + n) % n);
  const close = useCallback(() => setOpen(false), []);

  if (n === 0) {
    return <div className="grid aspect-[4/3] place-items-center rounded-2xl bg-paper-sunk text-mute"><Icon name="image" size={32} /></div>;
  }

  return (
    <div>
      <div
        className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-paper-sunk sm:aspect-[16/10]"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null || n < 2) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
      >
        <button type="button" onClick={() => setOpen(true)} aria-label="View photos full screen" className="absolute inset-0 block h-full w-full cursor-zoom-in">
          <ListingPhoto key={images[i].id} image={images[i]} alt={`${title}, photo ${i + 1} of ${n}`} priority={i === 0} sizes="(min-width: 1024px) 60vw, 100vw" />
        </button>
        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-paper-raised/90 shadow sm:grid"><Icon name="chevronLeft" size={16} /></button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-paper-raised/90 shadow sm:grid"><Icon name="chevronRight" size={16} /></button>
            <span className="pointer-events-none absolute bottom-2.5 right-2.5 rounded-full bg-black/55 px-2.5 py-0.5 text-[11px] font-medium text-white tabular-nums">{i + 1} / {n}</span>
          </>
        )}
      </div>
      {n > 1 && (
        <ul className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Photo thumbnails">
          {images.map((img, idx) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setI(idx)}
                aria-label={`Show photo ${idx + 1}`}
                aria-current={idx === i}
                className={`relative block h-14 w-[72px] overflow-hidden rounded-lg border-2 transition-opacity sm:h-16 sm:w-24 ${idx === i ? "border-ink-800" : "border-transparent opacity-70 hover:opacity-100"}`}
              >
                <ListingPhoto image={img} alt="" sizes="96px" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && <Lightbox images={images} start={i} title={title} onClose={close} />}
    </div>
  );
}

/**
 * Desktop photo mosaic (like Airbnb): one large photo and up to four smaller ones, with a "Show all photos" button.
 * Any photo opens the full-screen viewer at that image.
 */
export function PhotoMosaic({ images, title }: { images: ListingImageDto[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const n = images.length;
  if (n === 0) return null;

  const shown = images.slice(0, Math.min(n, 5));
  const cell = (i: number, cls: string, sizes: string) => (
    <button key={shown[i].id} type="button" onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1} of ${n}`} className={`group relative block overflow-hidden bg-paper-sunk ${cls}`}>
      <ListingPhoto image={shown[i]} alt={`${title}, photo ${i + 1}`} priority={i === 0} sizes={sizes} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
    </button>
  );
  // 1 photo: single. 2: halves. 3: big + two stacked. 4+: big + 2x2 grid.
  const layout = n === 1 ? "grid-cols-1" : n === 2 ? "grid-cols-2" : n === 3 ? "grid-cols-2 grid-rows-2" : "grid-cols-4 grid-rows-2";
  const big = n === 1 || n === 2 ? "" : n === 3 ? "row-span-2" : "col-span-2 row-span-2";

  return (
    <div className="relative">
      <div className={`grid h-[440px] gap-2.5 overflow-hidden rounded-2xl ${layout}`}>
        {shown.map((_, i) => cell(i, i === 0 ? big : "", i === 0 ? "50vw" : "25vw"))}
      </div>
      <button type="button" onClick={() => setOpen(0)} className="absolute bottom-4 right-4 inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-line-strong bg-paper-raised px-3.5 text-[13px] font-semibold shadow-sm hover:bg-paper-sunk">
        <Icon name="grid" size={14} /> Show all {n} photo{n === 1 ? "" : "s"}
      </button>
      {open !== null && <Lightbox images={images} start={open} title={title} onClose={close} />}
    </div>
  );
}
