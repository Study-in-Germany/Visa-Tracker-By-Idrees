import type { NextRequest } from "next/server";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function extractOrigin(headerVal: string | null): string | null {
  if (!headerVal) return null;
  try {
    return new URL(headerVal).origin.toLowerCase();
  } catch {
    return null;
  }
}

export function getAllowedOrigins(req?: NextRequest): Set<string> {
  const allowed = new Set<string>();
  if (req) {
    const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0]?.trim();
    const proto =
      (req.headers.get("x-forwarded-proto") || "").split(",")[0]?.trim() ||
      (req.nextUrl?.protocol ? req.nextUrl.protocol.replace(/:$/, "") : "") ||
      (process.env.NODE_ENV === "production" ? "https" : "http");
    if (host) {
      allowed.add(`${proto}://${host}`.toLowerCase());
      if (process.env.NODE_ENV !== "production") {
        allowed.add(`http://${host}`.toLowerCase());
        allowed.add(`https://${host}`.toLowerCase());
      }
    }
    if (req.nextUrl?.origin && req.nextUrl.origin !== "null") {
      allowed.add(req.nextUrl.origin.toLowerCase());
    }
  }
  const siteUrl = process.env.SITE_URL?.trim();
  if (siteUrl) {
    const o = extractOrigin(siteUrl);
    if (o) allowed.add(o);
  }
  return allowed;
}

/**
 * Verifies same-origin for cookie-authenticated state-changing requests.
 * Rejects cross-origin browser requests (`Origin` or `Referer` mismatch) and
 * rejects `Origin: null` (sandboxed iframes / data URLs).
 */
export function verifyCsrfOrigin(req: NextRequest): boolean {
  if (!STATE_CHANGING_METHODS.has(req.method.toUpperCase())) return true;

  const allowed = getAllowedOrigins(req);
  const originHeader = req.headers.get("origin");
  if (originHeader) {
    if (originHeader === "null") return false;
    const origin = extractOrigin(originHeader);
    return !!origin && allowed.has(origin);
  }

  const refererHeader = req.headers.get("referer");
  if (refererHeader) {
    const refererOrigin = extractOrigin(refererHeader);
    return !!refererOrigin && allowed.has(refererOrigin);
  }

  // Allow non-browser / same-site clients only when no Origin/Referer and Sec-Fetch-Site isn't cross-site
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite && !["same-origin", "same-site", "none"].includes(secFetchSite.toLowerCase())) {
    return false;
  }

  return true;
}
