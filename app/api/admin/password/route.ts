import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  createAdminSession,
  revokeServerSessionByToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth";
import { requireAdmin } from "@/lib/auth/authorization";
import { revokeAllSessionsForSubject } from "@/lib/auth/session-store";
import { getRequestIp, getRequestUserAgent, logAuthEvent } from "@/lib/auth/audit-log";
import { passwordProblem } from "@/lib/password";
import { privateJson } from "@/lib/security/cache-policy";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const ip = getRequestIp(req);
  const userAgent = getRequestUserAgent(req);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return privateJson({ error: "Invalid input" }, { status: 400 });

  const problem = passwordProblem(parsed.data.newPassword, auth.session.email);
  if (problem) return privateJson({ error: `New password ${problem}.` }, { status: 400 });

  const user = await prisma.adminUser.findUnique({ where: { id: auth.session.adminUserId } });
  if (!user) return privateJson({ error: "Admin not found" }, { status: 404 });

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return privateJson({ error: "Current password is incorrect" }, { status: 401 });

  if (parsed.data.newPassword === parsed.data.currentPassword) {
    return privateJson({ error: "Choose a password you haven't used here before." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });

  // Revoke all other admin sessions and rotate the current session
  await revokeAllSessionsForSubject("ADMIN", user.id, "PASSWORD_CHANGED");
  const priorToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (priorToken) {
    await revokeServerSessionByToken(priorToken, "PASSWORD_CHANGED").catch(() => {});
  }

  const { rawToken, sessionId } = await createAdminSession({
    adminUserId: user.id,
    authMethod: auth.session.authMethod,
    mfaVerifiedAt: auth.session.mfaVerifiedAt ?? new Date(),
    amr: ["pwd", "totp"],
    ip,
    userAgent,
  });

  await logAuthEvent({
    eventType: "ADMIN_PASSWORD_CHANGED",
    actorType: "ADMIN",
    actorId: user.id,
    ip,
    userAgent,
    metadata: { rotatedSessionId: sessionId },
  });

  const res = privateJson({ ok: true });
  const opts = sessionCookieOptions();
  res.cookies.set(opts.name, rawToken, opts);
  return res;
}
