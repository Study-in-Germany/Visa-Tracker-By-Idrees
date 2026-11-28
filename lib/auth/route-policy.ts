export type RoutePolicyClass =
  | "PUBLIC"
  | "AUTH_FLOW"
  | "APPLICANT_PROTECTED"
  | "SIGNED_IN_PROTECTED"
  | "ADMIN_PROTECTED"
  | "DEV_ONLY";

const PUBLIC_EXACT = new Set([
  "/",
  "/tracker",
  "/analytics",
  "/queue-progress",
  "/calculator",
  "/announcements",
  "/universities",
  "/programmes",
  "/programmes/compare",
  "/accommodation",
  "/resources",
  "/about",
  "/submit",
  "/more",
  "/landing-page",
  "/manifest.webmanifest",
  "/offline.html",
]);

const PUBLIC_PREFIXES = [
  "/tracker/",
  "/universities/",
  "/programmes/",
];

const AUTH_FLOW_EXACT = new Set([
  "/login",
  "/register",
  "/admin/login",
  "/forgot-access-code",
  "/unsubscribe",
]);

/**
 * Authoritative route classification policy.
 * Sensitive routes (/dashboard*, /admin*, listing creation/editing) deny by default.
 */
export function classifyRoute(pathname: string): RoutePolicyClass {
  if (pathname === "/visual-fixtures" || pathname.startsWith("/visual-fixtures/")) {
    return "DEV_ONLY";
  }
  if (AUTH_FLOW_EXACT.has(pathname)) {
    return "AUTH_FLOW";
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return "ADMIN_PROTECTED";
  }
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return "APPLICANT_PROTECTED";
  }
  if (pathname === "/accommodation/new" || /^\/accommodation\/[^/]+\/edit$/.test(pathname)) {
    return "SIGNED_IN_PROTECTED";
  }
  if (/^\/accommodation\/[^/]+$/.test(pathname)) {
    return "PUBLIC";
  }
  if (PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return "PUBLIC";
  }
  // Safe deny-by-default for unrecognized private/admin API paths
  if (pathname.startsWith("/api/admin/")) return "ADMIN_PROTECTED";
  if (pathname.startsWith("/api/applicant/me") || pathname === "/api/applicant/sessions") {
    return "APPLICANT_PROTECTED";
  }
  return "PUBLIC";
}
