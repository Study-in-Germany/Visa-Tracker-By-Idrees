/** Browser-side helpers for photo uploads. The server still validates everything again. */

export const PHOTO_ACCEPT = "image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif";

// Serverless hosts cap request bodies at a few MB, so large JPG/PNG phone photos are shrunk before sending.
const SHRINK_ABOVE = 3.5 * 1024 * 1024;
const MAX_EDGE = 2400;

/** Re-encodes a big JPG/PNG as a ≤2400px JPEG. HEIC (undecodable in most browsers) and small files pass through untouched. */
export async function shrinkIfLarge(file: File): Promise<File> {
  if (file.size <= SHRINK_ABOVE || !/^image\/(jpeg|png)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}
