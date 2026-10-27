import sharp from "sharp";

/** Limits for uploaded listing photos. */
export const IMAGE_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  minSide: 300,
  maxSide: 12_000,
  maxPixels: 60_000_000,
  maxPerListing: 8,
  maxUploadsPerHour: 30,
  maxPendingUploads: 24,
} as const;

/** The three delivered sizes: thumbnail, listing card, full image. */
export const VARIANT_WIDTHS = [320, 800, 1600] as const;
export type VariantWidth = (typeof VARIANT_WIDTHS)[number];

export class ImageError extends Error {
  status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.status = status;
  }
}

export type SourceKind = "jpeg" | "png" | "heic";

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

/** Identifies the format from magic bytes. The client-supplied MIME type and extension are never trusted. */
export function sniffImage(buf: Buffer): SourceKind | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 12 && buf.toString("latin1", 4, 8) === "ftyp" && HEIC_BRANDS.has(buf.toString("latin1", 8, 12))) return "heic";
  return null;
}

export type ProcessedVariant = { width: VariantWidth; buffer: Buffer };
export type ProcessedImage = { variants: ProcessedVariant[]; width: number; height: number; bytes: number };

async function heicToJpeg(buf: Buffer): Promise<Buffer> {
  // Prebuilt sharp cannot decode HEVC-based HEIC, so it is converted to JPEG first (pure WASM, no native deps).
  const convert = (await import("heic-convert")).default as (o: { buffer: Buffer; format: "JPEG"; quality: number }) => Promise<ArrayBuffer>;
  return Buffer.from(await convert({ buffer: buf, format: "JPEG", quality: 0.92 }));
}

/**
 * Validates and optimises one upload: checks the real file signature, size and dimensions, applies EXIF
 * rotation, strips all metadata, and renders three WebP variants (320 / 800 / 1600 px wide).
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length === 0) throw new ImageError("The file is empty.");
  if (input.length > IMAGE_LIMITS.maxBytes) throw new ImageError(`Each photo must be under ${IMAGE_LIMITS.maxBytes / 1024 / 1024} MB.`, 413);

  const kind = sniffImage(input);
  if (!kind) throw new ImageError("Only JPG, PNG and HEIC photos are accepted.", 415);

  let source = input;
  try {
    if (kind === "heic") source = await heicToJpeg(input);

    const base = sharp(source, { failOn: "error", limitInputPixels: IMAGE_LIMITS.maxPixels }).rotate(); // rotate() applies EXIF orientation
    const meta = await sharp(source, { limitInputPixels: IMAGE_LIMITS.maxPixels }).metadata();
    // Orientations 5-8 are rotated 90°, which swaps width and height.
    const swapped = (meta.orientation ?? 1) >= 5;
    const width = (swapped ? meta.height : meta.width) ?? 0;
    const height = (swapped ? meta.width : meta.height) ?? 0;

    if (Math.min(width, height) < IMAGE_LIMITS.minSide) {
      throw new ImageError(`Photos must be at least ${IMAGE_LIMITS.minSide}px on the short side.`);
    }
    if (Math.max(width, height) > IMAGE_LIMITS.maxSide) {
      throw new ImageError(`Photos can be at most ${IMAGE_LIMITS.maxSide}px on the long side.`);
    }

    const variants = await Promise.all(
      VARIANT_WIDTHS.map(async (w) => ({
        width: w,
        // No withMetadata(): sharp drops EXIF/GPS/ICC by default, so location data never reaches storage.
        buffer: await base.clone().resize({ width: w, withoutEnlargement: true, fit: "inside" }).webp({ quality: 80, effort: 4 }).toBuffer(),
      })),
    );
    return { variants, width, height, bytes: variants.reduce((s, v) => s + v.buffer.length, 0) };
  } catch (e) {
    if (e instanceof ImageError) throw e;
    throw new ImageError("This image could not be read. Try exporting it as a JPG or PNG.");
  }
}
