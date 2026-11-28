import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import {
  listActiveSessionsForSubject,
  revokeAllSessionsForSubject,
  revokeSessionById,
} from "@/lib/auth/session-store";
import { getRequestIp, getRequestUserAgent, logAuthEvent } from "@/lib/auth/audit-log";
import { privateJson } from "@/lib/security/cache-policy";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const sessions = await listActiveSessionsForSubject(
    "ADMIN",
    auth.session.adminUserId,
    auth.session.sessionId
  );
  return privateJson({ sessions });
}

const deleteSchema = z.object({
  mode: z.enum(["single", "others"]).default("single"),
  sessionId: z.string().min(4).max(80).optional(),
});

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
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
      "ADMIN",
      auth.session.adminUserId,
      "ADMIN_REVOKED_OTHER_SESSIONS",
      auth.session.sessionId
    );
    await logAuthEvent({
      eventType: "ADMIN_REVOKED_OTHER_SESSIONS",
      actorType: "ADMIN",
      actorId: auth.session.adminUserId,
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
    return privateJson({ error: "Use Sign out to end your current session." }, { status: 400 });
  }

  const revoked = await revokeSessionById(
    parsed.data.sessionId,
    "ADMIN",
    auth.session.adminUserId,
    "ADMIN_REVOKED_SESSION"
  );
  if (!revoked) {
    return privateJson({ error: "Session not found." }, { status: 404 });
  }

  await logAuthEvent({
    eventType: "ADMIN_REVOKED_SESSION",
    actorType: "ADMIN",
    actorId: auth.session.adminUserId,
    ip,
    userAgent,
    metadata: { revokedSessionId: parsed.data.sessionId },
  });
  return privateJson({ ok: true, revokedCount: 1 });
}
