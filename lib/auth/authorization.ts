import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  APPLICANT_SESSION_COOKIE_NAME,
} from "./session-policy";
import {
  validateServerSession,
  type ValidatedAdminSession,
  type ValidatedApplicantSession,
} from "./session-store";
import { privateJson } from "@/lib/security/cache-policy";

export async function getApplicantSession(opts?: {
  touch?: boolean;
}): Promise<ValidatedApplicantSession | null> {
  const token = cookies().get(APPLICANT_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return validateServerSession(token, "APPLICANT", opts);
}

export async function getAdminSession(opts?: {
  touch?: boolean;
  requireFreshMfaMs?: number;
}): Promise<ValidatedAdminSession | null> {
  const token = cookies().get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return validateServerSession(token, "ADMIN", opts);
}

export async function requireApplicant(): Promise<
  | { ok: true; session: ValidatedApplicantSession }
  | { ok: false; response: NextResponse }
> {
  const session = await getApplicantSession();
  if (!session) {
    return {
      ok: false,
      response: privateJson({ error: "Please sign in to continue." }, { status: 401 }),
    };
  }
  return { ok: true, session };
}

export async function requireAdmin(opts?: {
  requireFreshMfaMs?: number;
}): Promise<
  | { ok: true; session: ValidatedAdminSession }
  | { ok: false; response: NextResponse }
> {
  const session = await getAdminSession(opts);
  if (!session) {
    const applicant = await getApplicantSession({ touch: false });
    if (applicant) {
      return {
        ok: false,
        response: privateJson({ error: "Administrator access required." }, { status: 403 }),
      };
    }
    return {
      ok: false,
      response: privateJson({ error: "Please sign in to continue." }, { status: 401 }),
    };
  }
  if (session.role !== "ADMIN") {
    return {
      ok: false,
      response: privateJson({ error: "Insufficient administrator permissions." }, { status: 403 }),
    };
  }
  return { ok: true, session };
}

export async function requireApplicantPage(nextPath = "/dashboard"): Promise<ValidatedApplicantSession> {
  const session = await getApplicantSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return session;
}

export async function requireAdminPage(nextPath = "/admin"): Promise<ValidatedAdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }
  return session;
}
