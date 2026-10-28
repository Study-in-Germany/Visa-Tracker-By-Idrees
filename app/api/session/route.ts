import { NextResponse } from "next/server";
import { getActor } from "@/lib/permissions";

// GET /api/session — who is signed in, so pages can show the right actions. Contains no personal data.
export async function GET() {
  const actor = await getActor();
  return NextResponse.json({ role: actor.role, ...(actor.role === "applicant" ? { publicId: actor.publicId } : {}), ...(actor.role === "admin" ? { email: actor.email } : {}) }, { headers: { "Cache-Control": "no-store" } });
}
