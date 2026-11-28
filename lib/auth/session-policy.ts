export const ADMIN_SESSION_COOKIE_NAME = "vt_admin_session";
export const APPLICANT_SESSION_COOKIE_NAME = "vt_applicant_session";
export const SESSION_COOKIE_NAME = ADMIN_SESSION_COOKIE_NAME;

function positiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function getApplicantSessionPolicy() {
  const idleHours = positiveIntEnv("APPLICANT_SESSION_IDLE_HOURS", 24);
  const absoluteDays = positiveIntEnv("APPLICANT_SESSION_ABSOLUTE_DAYS", 7);
  return {
    idleMs: idleHours * 60 * 60 * 1000,
    absoluteMs: absoluteDays * 24 * 60 * 60 * 1000,
    maxAgeSeconds: absoluteDays * 24 * 60 * 60,
  };
}

export function getAdminSessionPolicy() {
  const idleMinutes = positiveIntEnv("ADMIN_SESSION_IDLE_MINUTES", 30);
  const absoluteHours = positiveIntEnv("ADMIN_SESSION_ABSOLUTE_HOURS", 12);
  const stepUpMinutes = positiveIntEnv("ADMIN_STEP_UP_MINUTES", 10);
  return {
    idleMs: idleMinutes * 60 * 1000,
    absoluteMs: absoluteHours * 60 * 60 * 1000,
    stepUpMs: stepUpMinutes * 60 * 1000,
    maxAgeSeconds: absoluteHours * 60 * 60,
  };
}

export const SESSION_TOUCH_INTERVAL_MS = 2 * 60 * 1000;

export function buildSessionCookieOptions(kind: "admin" | "applicant") {
  const name = kind === "admin" ? ADMIN_SESSION_COOKIE_NAME : APPLICANT_SESSION_COOKIE_NAME;
  const maxAge =
    kind === "admin"
      ? getAdminSessionPolicy().maxAgeSeconds
      : getApplicantSessionPolicy().maxAgeSeconds;
  return {
    name,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function buildExpiredCookieOptions(name: string) {
  return {
    name,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  };
}
