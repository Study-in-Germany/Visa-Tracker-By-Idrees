import { NextRequest } from "next/server";
import {
  APPLICANT_SESSION_COOKIE_NAME,
  buildExpiredCookieOptions,
  revokeServerSessionByToken,
  getApplicantSession,
} from "@/lib/auth";
import { getRequestIp, getRequestUserAgent, logAuthEvent } from "@/lib/auth/audit-log";
import { privateJson } from "@/lib/security/cache-policy";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(APPLICANT_SESSION_COOKIE_NAME)?.value;
  const expired = buildExpiredCookieOptions(APPLICANT_SESSION_COOKIE_NAME);

  try {
    const current = await getApplicantSession({ touch: false });
    if (token) {
      await revokeServerSessionByToken(token, "USER_LOGOUT");
    }
    await logAuthEvent({
      eventType: "APPLICANT_LOGOUT",
      actorType: current ? "APPLICANT" : "GUEST",
      actorId: current?.applicantId ?? null,
      ip: getRequestIp(req),
      userAgent: getRequestUserAgent(req),
      metadata: { sessionId: current?.sessionId ?? null },
    });

    const res = privateJson({ ok: true });
    res.cookies.set(expired.name, "", expired);
    return res;
  } catch (err) {
    await logAuthEvent({
      eventType: "APPLICANT_LOGOUT_FAILED",
      actorType: "SYSTEM",
      ip: getRequestIp(req),
      userAgent: getRequestUserAgent(req),
      metadata: { message: err instanceof Error ? err.message : "unknown" },
    });
    const res = privateJson(
      { ok: false, error: "Could not revoke your server session. Please retry." },
      { status: 500 }
    );
    res.cookies.set(expired.name, "", expired);
    return res;
  }
}
