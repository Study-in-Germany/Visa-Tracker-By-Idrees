import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { hashPayload, signS3Request } from "./sigv4";

/**
 * Persistent object storage for uploaded images.
 *
 * Production: any S3-compatible bucket (AWS S3, Cloudflare R2, Backblaze B2, Supabase Storage, MinIO)
 * configured through S3_* env vars. Development: files on local disk, served by /media.
 * Production never falls back to local disk, because serverless disks are ephemeral.
 */
export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  removePrefix(keys: string[]): Promise<void>;
  url(key: string): string;
}

const IMMUTABLE = "public, max-age=31536000, immutable";

function s3Config() {
  const { S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL } = process.env;
  if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_PUBLIC_URL) return null;
  return {
    bucket: S3_BUCKET,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    publicUrl: S3_PUBLIC_URL.replace(/\/+$/, ""),
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT?.replace(/\/+$/, "") || null,
  };
}

const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");

function createS3Storage(c: NonNullable<ReturnType<typeof s3Config>>): Storage {
  // A custom endpoint (R2, MinIO, …) uses path-style URLs; plain AWS uses virtual-hosted style.
  const objectUrl = (key: string) =>
    c.endpoint ? new URL(`${c.endpoint}/${c.bucket}/${encodeKey(key)}`) : new URL(`https://${c.bucket}.s3.${c.region}.amazonaws.com/${encodeKey(key)}`);

  async function send(method: "PUT" | "DELETE", key: string, body?: Buffer, contentType?: string) {
    const url = objectUrl(key);
    const headers: Record<string, string> = {};
    if (body && contentType) {
      headers["content-type"] = contentType;
      headers["cache-control"] = IMMUTABLE;
    }
    const signed = signS3Request({
      method, url, headers,
      payloadHash: hashPayload(body ?? ""),
      region: c.region, accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey,
    });
    const res = await fetch(url, { method, headers: signed, body: body ? new Uint8Array(body) : undefined });
    if (!res.ok && !(method === "DELETE" && res.status === 404)) {
      throw new Error(`Object storage ${method} failed (${res.status}): ${(await res.text().catch(() => "")).slice(0, 200)}`);
    }
  }

  return {
    put: (key, body, type) => send("PUT", key, body, type),
    removePrefix: async (keys) => { await Promise.all(keys.map((k) => send("DELETE", k))); },
    url: (key) => `${c.publicUrl}/${encodeKey(key)}`,
  };
}

export const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

/** Resolves a storage key inside LOCAL_ROOT, or null if it would escape it. */
export function localPath(key: string) {
  const full = path.resolve(LOCAL_ROOT, key);
  return full.startsWith(LOCAL_ROOT + path.sep) ? full : null;
}

const localStorageDriver: Storage = {
  async put(key, body) {
    const full = localPath(key);
    if (!full) throw new Error("Invalid storage key");
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
  },
  async removePrefix(keys) {
    await Promise.all(keys.map((k) => { const f = localPath(k); return f ? rm(f, { force: true }) : undefined; }));
  },
  url: (key) => `/media/${encodeKey(key)}`,
};

export function getStorage(): Storage {
  const cfg = s3Config();
  if (cfg) return createS3Storage(cfg);
  if (process.env.NODE_ENV === "production") {
    throw new Error("Image storage is not configured: set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and S3_PUBLIC_URL.");
  }
  return localStorageDriver;
}
