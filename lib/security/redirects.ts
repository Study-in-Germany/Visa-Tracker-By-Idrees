/**
 * Validates internal redirect destinations (`next`, `returnUrl`, `callbackUrl`).
 * Prevents open redirects, protocol-relative URLs, backslash tricks, and role escalation redirects.
 */
export function sanitizeRedirectPath(
  raw: string | null | undefined,
  fallback = "/dashboard",
  role?: "applicant" | "admin" | "guest"
): string {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
  if (/[\x00-\x1f\x7f\\]/.test(trimmed)) return fallback;

  // Verify URL parsing stays on the same dummy origin
  try {
    const parsed = new URL(trimmed, "https://internal.local");
    if (parsed.origin !== "https://internal.local") return fallback;
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    // Never redirect an applicant into admin routes
    if (role !== "admin" && (normalized === "/admin" || normalized.startsWith("/admin/"))) {
      return fallback;
    }
    return normalized;
  } catch {
    return fallback;
  }
}
