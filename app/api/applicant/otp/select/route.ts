import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { otpSelectSchema } from "@/lib/validations";
import {
  APPLICANT_SESSION_COOKIE_NAME,
  applicantSessionCookieOptions,
  createApplicantSession,
  revokeServerSessionByToken,
} from "@/lib/auth";
import { consumeAuthGrant } from "@/lib/auth/grants";
import { getRequestIp, getRequestUserAgent, logAuthEvent } from "@/lib/auth/audit-log";
import { privateJson } from "@/lib/security/cache-policy";

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const userAgent = getRequestUserAgent(req);

  const body = await req.json().catch(() => null);
  const parsed = otpSelectSchema.safeParse(body);
  if (!parsed.success) {
    return privateJson({ error: "Invalid account selection." }, { status: 400 });
  }

  const grant = await consumeAuthGrant(parsed.data.selectionToken, "OTP_SELECT");
  if (!grant || !grant.subjectIds.includes(parsed.data.applicantId)) {
    return privateJson(
      { error: "Selection session expired. Please request a new code." },
      { status: 401 }
    );
  }

  const applicant = await prisma.applicant.findUnique({
    where: { id: parsed.data.applicantId },
    select: { id: true, publicId: true, disabledAt: true },
  });
  if (!applicant || applicant.disabledAt) {
    return privateJson({ error: "Account not found." }, { status: 404 });
  }

  const priorToken = req.cookies.get(APPLICANT_SESSION_COOKIE_NAME)?.value;
  if (priorToken) {
    await revokeServerSessionByToken(priorToken, "SESSION_ROTATED").catch(() => {});
  }

  const { rawToken, sessionId } = await createApplicantSession({
    applicantId: applicant.id,
    authMethod: "email_otp",
    ip,
    userAgent,
  });

  await logAuthEvent({
    eventType: "APPLICANT_LOGIN_SUCCESS",
    actorType: "APPLICANT",
    actorId: applicant.id,
    ip,
    userAgent,
    metadata: { publicId: applicant.publicId, method: "email_otp_select", sessionId },
  });

  const res = privateJson({ ok: true, publicId: applicant.publicId });
  const opts = applicantSessionCookieOptions();
  res.cookies.set(opts.name, rawToken, opts);
  return res;
}
