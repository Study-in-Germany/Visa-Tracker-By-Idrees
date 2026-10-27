"use client";

import Image from "next/image";
import type { ListingImageDto } from "@/lib/marketplace";

type Variants = Pick<ListingImageDto, "thumbUrl" | "cardUrl" | "fullUrl">;

/** Chooses the pre-generated WebP (320 / 800 / 1600 px) closest to the width Next.js asks for. */
const loaderFor = (v: Variants) => ({ width }: { width: number }) => (width <= 320 ? v.thumbUrl : width <= 800 ? v.cardUrl : v.fullUrl);

/**
 * Responsive, lazy-loaded photo using next/image with a custom loader, so the browser picks the right
 * stored variant from the srcset and nothing is re-encoded. Fills its parent (give the parent a size/aspect ratio).
 */
export default function ListingPhoto({
  image, alt, sizes, priority = false, className = "object-cover",
}: {
  image: Variants;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return <Image loader={loaderFor(image)} src={image.cardUrl} alt={alt} fill sizes={sizes} priority={priority} loading={priority ? undefined : "lazy"} className={className} />;
}
