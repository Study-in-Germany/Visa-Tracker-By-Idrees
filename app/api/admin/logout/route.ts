import { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  buildExpiredCookieOptions,
  revokeServerSessionByToken,
  getSession,
} from "@/lib/auth";
import { getRequestIp, getRequestUserAgent, logAuthEvent } from "@/lib/auth/audit-log";
import { privateJson } from "@/lib/security/cache-policy";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const expired = buildExpiredCookieOptions(SESSION_COOKIE_NAME);

  try {
    const current = await getSession({ touch: false });
    if (token) {
      await revokeServerSessionByToken(token, "ADMIN_LOGOUT");
    }
    await logAuthEvent({
      eventType: "ADMIN_LOGOUT",
      actorType: current ? "ADMIN" : "GUEST",
      actorId: current?.adminUserId ?? null,
      ip: getRequestIp(req),
      userAgent: getRequestUserAgent(req),
      metadata: { sessionId: current?.sessionId ?? null },
    });

    const res = privateJson({ ok: true });
    res.cookies.set(expired.name, "", expired);
    return res;
  } catch (err) {
    await logAuthEvent({
      eventType: "ADMIN_LOGOUT_FAILED",
      actorType: "SYSTEM",
      ip: getRequestIp(req),
      userAgent: getRequestUserAgent(req),
      metadata: { message: err instanceof Error ? err.message : "unknown" },
    });
    const res = privateJson(
      { ok: false, error: "Could not revoke your administrator session. Please retry." },
      { status: 500 }
    );
    res.cookies.set(expired.name, "", expired);
    return res;
  }
}
