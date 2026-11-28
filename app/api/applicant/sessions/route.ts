import { NextRequest } from "next/server";
import { z } from "zod";
import { requireApplicant } from "@/lib/auth/authorization";
import {
  listActiveSessionsForSubject,
  revokeAllSessionsForSubject,
  revokeSessionById,
} from "@/lib/auth/session-store";
import { getRequestIp, getRequestUserAgent, logAuthEvent } from "@/lib/auth/audit-log";
import { privateJson } from "@/lib/security/cache-policy";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApplicant();
  if (!auth.ok) return auth.response;

  const sessions = await listActiveSessionsForSubject(
    "APPLICANT",
    auth.session.applicantId,
    auth.session.sessionId
  );
  return privateJson({ sessions });
}

const deleteSchema = z.object({
  mode: z.enum(["single", "others"]).default("single"),
  sessionId: z.string().min(4).max(80).optional(),
});

export async function DELETE(req: NextRequest) {
  const auth = await requireApplicant();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return privateJson({ error: "Invalid session revocation request." }, { status: 400 });
  }

  const ip = getRequestIp(req);
  const userAgent = getRequestUserAgent(req);

  if (parsed.data.mode === "others") {
    const count = await revokeAllSessionsForSubject(
      "APPLICANT",
      auth.session.applicantId,
      "USER_REVOKED_OTHER_SESSIONS",
      auth.session.sessionId
    );
    await logAuthEvent({
      eventType: "APPLICANT_REVOKED_OTHER_SESSIONS",
      actorType: "APPLICANT",
      actorId: auth.session.applicantId,
      ip,
      userAgent,
      metadata: { count },
    });
    return privateJson({ ok: true, revokedCount: count });
  }

  if (!parsed.data.sessionId) {
    return privateJson({ error: "Missing sessionId." }, { status: 400 });
  }
  if (parsed.data.sessionId === auth.session.sessionId) {
    return privateJson({ error: "Use Log out to end your current session." }, { status: 400 });
  }

  const revoked = await revokeSessionById(
    parsed.data.sessionId,
    "APPLICANT",
    auth.session.applicantId,
    "USER_REVOKED_SESSION"
  );
  if (!revoked) {
    return privateJson({ error: "Session not found." }, { status: 404 });
  }

  await logAuthEvent({
    eventType: "APPLICANT_REVOKED_SESSION",
    actorType: "APPLICANT",
    actorId: auth.session.applicantId,
    ip,
    userAgent,
    metadata: { revokedSessionId: parsed.data.sessionId },
  });
  return privateJson({ ok: true, revokedCount: 1 });
}
