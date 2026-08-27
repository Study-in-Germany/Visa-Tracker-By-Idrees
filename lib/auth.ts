import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "vt_admin_session";
const APPLICANT_COOKIE = "vt_applicant_session";
const alg = "HS256";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET env var is not set");
  return new TextEncoder().encode(secret);
}

// ---------- Admin session ----------

export async function createSessionToken(email: string) {
  return await new SignJWT({ email, kind: "admin" })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as { email: string; kind: string };
  } catch {
    return null;
  }
}

export async function getSession() {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload || payload.kind !== "admin") return null;
  return payload;
}

export function sessionCookieOptions() {
  return {
    name: ADMIN_COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export const SESSION_COOKIE_NAME = ADMIN_COOKIE;

// ---------- Applicant session ----------

export async function createApplicantSessionToken(applicantId: string, publicId: string) {
  return await new SignJWT({ applicantId, publicId, kind: "applicant" })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime("90d")
    .sign(getSecret());
}

export async function verifyApplicantSessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.kind !== "applicant") return null;
    return payload as { applicantId: string; publicId: string; kind: string };
  } catch {
    return null;
  }
}

export async function getApplicantSession() {
  const token = cookies().get(APPLICANT_COOKIE)?.value;
  if (!token) return null;
  return await verifyApplicantSessionToken(token);
}

export function applicantSessionCookieOptions() {
  return {
    name: APPLICANT_COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  };
}

export const APPLICANT_SESSION_COOKIE_NAME = APPLICANT_COOKIE;
