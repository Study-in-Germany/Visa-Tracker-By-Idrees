import Link from "next/link";
import Icon from "@/components/ui/Icon";
import ListingPhoto from "@/components/ui/ListingPhoto";
import { Skeleton } from "@/components/ui/States";
import ListingStatusBadge from "./ListingStatusBadge";
import SaveButton from "./SaveButton";
import { eur, LISTING_TYPE_LABELS, type ListingCardDto } from "@/lib/marketplace";

const availability = (iso: string) => {
  const d = new Date(iso);
  if (d.getTime() <= Date.now()) return "Available now";
  return `From ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`;
};

/** Translucent badge for use on top of photos. */
const glass = "inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md";

/** A "looking for a place" post. It's a request, not a property, so there is no photo: just the facts, as a compact text card. */
function RequestCard({ l, href, footer }: { l: ListingCardDto; href?: string; footer?: React.ReactNode }) {
  const chip = "badge border-line-strong bg-paper-sunk text-ink-700";
  return (
    <article className="flex min-w-0 flex-col">
      <div className="card relative flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-mute"><Icon name="search" size={12} /> Looking for {LISTING_TYPE_LABELS[l.type].toLowerCase()}</span>
          <span className="relative z-10 flex items-center gap-1.5">
            {l.status !== "APPROVED" && <ListingStatusBadge status={l.status} />}
            <SaveButton id={l.id} />
          </span>
        </div>
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug">
          <Link href={href ?? `/accommodation/${l.id}`} className="after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-clay-500">{l.title}</Link>
        </h3>
        {l.excerpt && <p className="line-clamp-2 text-[13px] leading-relaxed text-mute">{l.excerpt}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          <span className={chip}><Icon name="pin" size={11} /> {[l.district, l.city].filter(Boolean).join(", ")}</span>
          <span className={chip}><Icon name="calendar" size={11} /> {availability(l.availableFrom).replace("From ", "").replace("Available now", "Now")}</span>
          {l.anmeldung && <span className={chip}>Anmeldung</span>}
        </div>
        <p className="border-t border-line pt-3 text-[14px]">
          {l.rentEur == null ? <span className="font-semibold">Budget flexible</span> : <><span className="text-mute">Budget up to </span><span className="font-semibold">{eur(l.rentEur)}</span><span className="text-mute"> / month</span></>}
        </p>
      </div>
      {footer && <div className="mt-2.5">{footer}</div>}
    </article>
  );
}

/** Photo-first card for places offered. `footer` holds owner/admin actions. Requests render as a text card instead. */
export default function ListingCard({ l, href, footer, priority = false }: { l: ListingCardDto; href?: string; footer?: React.ReactNode; priority?: boolean }) {
  if (l.kind === "SEEKING") return <RequestCard l={l} href={href} footer={footer} />;
  const live = l.status === "APPROVED";
  return (
    <article className="group flex min-w-0 flex-col">
      <Link href={href ?? `/accommodation/${l.id}`} className="block rounded-2xl focus-visible:ring-offset-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-paper-sunk">
          {l.cover ? (
            <ListingPhoto image={l.cover} alt={l.title} priority={priority} sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className={`object-cover transition-transform duration-300 group-hover:scale-[1.03] ${l.status === "RENTED" ? "grayscale" : ""}`} />
          ) : (
            <div className="grid h-full place-items-center text-mute"><Icon name="image" size={30} /></div>
          )}
          <span className={`${glass} absolute left-2.5 top-2.5`}>{LISTING_TYPE_LABELS[l.type]}</span>
          <span className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
            {!live && <ListingStatusBadge status={l.status} />}
            <SaveButton id={l.id} overlay />
          </span>
          {live && Date.now() - new Date(l.createdAt).getTime() < 3 * 86_400_000 && <span className={`${glass} absolute bottom-2.5 left-2.5`}>New</span>}
          {l.imageCount > 1 && (
            <span className={`${glass} absolute bottom-2.5 right-2.5`}>
              <Icon name="image" size={11} /> {l.imageCount}
            </span>
          )}
        </div>
        <div className="px-0.5 pt-2.5">
          <h3 className="line-clamp-1 text-[14px] font-semibold">{l.title}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-[13px] text-mute">
            <Icon name="pin" size={12} className="shrink-0" />
            <span className="truncate">{[l.district, l.city].filter(Boolean).join(", ")}</span>
          </p>
          <p className="mt-1 text-[14px]">
            {l.rentEur == null ? (
              <span className="font-semibold">Rent on request</span>
            ) : (
              <>
                <span className="font-semibold">{eur(l.rentEur)}</span>
                <span className="text-mute"> / month{l.billsIncluded ? " · bills incl." : ""}</span>
              </>
            )}
          </p>
          <p className="mt-0.5 text-xs text-mute">
            {availability(l.availableFrom)}
            {l.furnished ? " · Furnished" : ""}
            {l.anmeldung ? " · Anmeldung possible" : ""}
          </p>
        </div>
      </Link>
      {footer && <div className="mt-2.5">{footer}</div>}
    </article>
  );
}

export function ListingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          <Skeleton className="mt-3 h-3.5 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
          <Skeleton className="mt-2 h-3.5 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function ListingGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>;
}
