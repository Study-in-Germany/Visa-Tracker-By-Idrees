import { NextRequest } from "next/server";
import { z } from "zod";
import { peekAuthGrant, updateAuthGrantPayload } from "@/lib/auth/grants";
import {
  buildOtpAuthUri,
  encryptTotpSecret,
  formatTotpSecretForDisplay,
  generateTotpSecret,
} from "@/lib/auth/totp";
import { getRequestIp, getRequestUserAgent, logAuthEvent } from "@/lib/auth/audit-log";
import { privateJson } from "@/lib/security/cache-policy";

const schema = z.object({
  enrollmentToken: z.string().min(10).max(200),
});

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const userAgent = getRequestUserAgent(req);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return privateJson({ error: "Invalid MFA enrollment request." }, { status: 400 });
  }

  const grant = await peekAuthGrant(parsed.data.enrollmentToken, "ADMIN_MFA_ENROLL");
  if (!grant || !grant.adminUserId) {
    return privateJson(
      { error: "MFA enrollment session expired. Please sign in again." },
      { status: 401 }
    );
  }

  const secret = generateTotpSecret();
  const pendingSecretEnc = encryptTotpSecret(secret);
  const updated = await updateAuthGrantPayload(grant.id, { pendingSecretEnc });
  if (!updated) {
    return privateJson(
      { error: "MFA enrollment session expired. Please sign in again." },
      { status: 401 }
    );
  }

  await logAuthEvent({
    eventType: "ADMIN_MFA_ENROLL_STARTED",
    actorType: "ADMIN",
    actorId: grant.adminUserId,
    ip,
    userAgent,
  });

  return privateJson({
    ok: true,
    issuer: "Visa Tracker Admin",
    accountName: grant.email,
    secretFormatted: formatTotpSecretForDisplay(secret),
    otpauthUri: buildOtpAuthUri(grant.email, secret),
  });
}
