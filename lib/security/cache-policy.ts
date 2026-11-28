import { NextResponse } from "next/server";

export const PRIVATE_NO_STORE_HEADERS: Record<string, string> = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Vary: "Cookie",
};

export function applyPrivateNoStoreHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(PRIVATE_NO_STORE_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

export function privateJson<T>(data: T, init?: ResponseInit): NextResponse<T> {
  const headers = new Headers(init?.headers);
  for (const [k, v] of Object.entries(PRIVATE_NO_STORE_HEADERS)) {
    headers.set(k, v);
  }
  return NextResponse.json(data, { ...init, headers });
}
