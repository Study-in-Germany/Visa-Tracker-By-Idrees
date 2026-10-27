import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getApplicantSession, getSession } from "@/lib/auth";

/** Who is making the request. Admin and applicant sessions use separate cookies; admin wins if both exist. */
export type Actor =
  | { role: "admin"; email: string }
  | { role: "applicant"; applicantId: string; publicId: string }
  | { role: "guest" };

export async function getActor(): Promise<Actor> {
  const admin = await getSession();
  if (admin) return { role: "admin", email: admin.email };
  const applicant = await getApplicantSession();
  if (applicant) return { role: "applicant", applicantId: applicant.applicantId, publicId: applicant.publicId };
  return { role: "guest" };
}

export const isAdmin = (a: Actor): a is Extract<Actor, { role: "admin" }> => a.role === "admin";
export const isSignedIn = (a: Actor) => a.role !== "guest";

/** Admins may manage any listing; applicants only their own. */
export const canManageListing = (a: Actor, listing: { ownerId: string }) =>
  a.role === "admin" || (a.role === "applicant" && a.applicantId === listing.ownerId);

export const apiError = (message: string, status: number) => NextResponse.json({ error: message }, { status });
export const unauthorized = () => apiError("Please sign in to continue.", 401);
export const forbidden = () => apiError("You don't have permission to do that.", 403);

/** Stable, salted per-client key so signed-out visitors can be deduplicated without storing their IP. */
export function clientKey(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}:${ip}`).digest("hex").slice(0, 32);
}
