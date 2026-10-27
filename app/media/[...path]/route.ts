import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { localPath } from "@/lib/storage";

export const runtime = "nodejs";

// Serves locally stored uploads in development. In production images come straight from object storage.
export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });
  const file = localPath(params.path.join("/"));
  if (!file || !file.endsWith(".webp")) return new NextResponse(null, { status: 404 });
  try {
    return new NextResponse(new Uint8Array(await readFile(file)), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
