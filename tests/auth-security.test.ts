import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";
import {
  createServerSession,
  revokeAllSessionsForSubject,
  revokeServerSessionByToken,
  validateServerSession,
} from "../lib/auth/session-store";
import { consumeAuthGrant, createAuthGrant } from "../lib/auth/grants";
import {
  buildOtpAuthUri,
  computeTotpCode,
  decryptTotpSecret,
  encryptTotpSecret,
  generateAdminRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  verifyRecoveryCodeHash,
  verifyTotpCode,
} from "../lib/auth/totp";
import { classifyRoute } from "../lib/auth/route-policy";
import { sanitizeRedirectPath } from "../lib/security/redirects";
import { verifyCsrfOrigin } from "../lib/security/csrf";
import { generateSixDigitOtp, issueOtp, verifyOtp } from "../lib/otp";
import { generateAccessCode } from "../lib/ids";

process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-key-for-unit-tests-only-1234";

test("generateSixDigitOtp preserves leading zeros and length 6", () => {
  for (let i = 0; i < 50; i++) {
    const code = generateSixDigitOtp();
    assert.match(code, /^\d{6}$/);
  }
});

test("generateAccessCode produces 12-character XXXX-XXXX-XXXX CSPRNG format", () => {
  const code = generateAccessCode();
  assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
});

test("Route access policy denies sensitive paths by default and classifies public/protected routes", () => {
  assert.equal(classifyRoute("/"), "PUBLIC");
  assert.equal(classifyRoute("/tracker"), "PUBLIC");
  assert.equal(classifyRoute("/tracker/PK-ISB-10001"), "PUBLIC");
  assert.equal(classifyRoute("/dashboard"), "APPLICANT_PROTECTED");
  assert.equal(classifyRoute("/dashboard/information"), "APPLICANT_PROTECTED");
  assert.equal(classifyRoute("/dashboard/unknown-nested-page"), "APPLICANT_PROTECTED");
  assert.equal(classifyRoute("/admin"), "ADMIN_PROTECTED");
  assert.equal(classifyRoute("/admin/settings"), "ADMIN_PROTECTED");
  assert.equal(classifyRoute("/admin/login"), "AUTH_FLOW");
  assert.equal(classifyRoute("/accommodation/new"), "SIGNED_IN_PROTECTED");
  assert.equal(classifyRoute("/accommodation/abc123/edit"), "SIGNED_IN_PROTECTED");
  assert.equal(classifyRoute("/api/admin/anything"), "ADMIN_PROTECTED");
  assert.equal(classifyRoute("/api/applicant/me"), "APPLICANT_PROTECTED");
});

test("sanitizeRedirectPath blocks open redirects, backslash tricks, and applicant->admin escalation", () => {
  assert.equal(sanitizeRedirectPath("/dashboard/updates", "/dashboard", "applicant"), "/dashboard/updates");
  assert.equal(sanitizeRedirectPath("https://evil.example/phish", "/dashboard", "applicant"), "/dashboard");
  assert.equal(sanitizeRedirectPath("//evil.example", "/dashboard", "applicant"), "/dashboard");
  assert.equal(sanitizeRedirectPath("/\\evil.example", "/dashboard", "applicant"), "/dashboard");
  assert.equal(sanitizeRedirectPath("javascript:alert(1)", "/dashboard", "applicant"), "/dashboard");
  assert.equal(sanitizeRedirectPath("/admin/applicants", "/dashboard", "applicant"), "/dashboard");
  assert.equal(sanitizeRedirectPath("/admin/applicants", "/admin", "admin"), "/admin/applicants");
});

test("verifyCsrfOrigin allows same-origin and blocks cross-origin or null-origin mutations", () => {
  const makeReq = (method: string, headers: Record<string, string>) =>
    ({
      method,
      headers: new Headers(headers),
      nextUrl: new URL("https://visatracker.example/api/applicant/me"),
    }) as any;

  assert.equal(verifyCsrfOrigin(makeReq("GET", { origin: "https://evil.example" })), true);
  assert.equal(
    verifyCsrfOrigin(makeReq("POST", { host: "visatracker.example", origin: "https://visatracker.example" })),
    true
  );
  assert.equal(
    verifyCsrfOrigin(makeReq("POST", { host: "visatracker.example", origin: "https://evil.example" })),
    false
  );
  assert.equal(
    verifyCsrfOrigin(makeReq("PATCH", { host: "visatracker.example", origin: "null" })),
    false
  );
  assert.equal(
    verifyCsrfOrigin(makeReq("DELETE", { host: "visatracker.example", referer: "https://evil.example/attack" })),
    false
  );
});

test("TOTP encryption, verification, and recovery codes work reliably", async () => {
  const secret = generateTotpSecret();
  const enc = encryptTotpSecret(secret);
  assert.notEqual(enc, secret);
  assert.equal(decryptTotpSecret(enc), secret);

  const uri = buildOtpAuthUri("admin@example.com", secret);
  assert.ok(uri.startsWith("otpauth://totp/"));

  const now = Date.now();
  const validCode = computeTotpCode(secret, now);
  assert.equal(verifyTotpCode(secret, validCode, now), true);
  assert.equal(verifyTotpCode(secret, "000000", now), false);

  const codes = generateAdminRecoveryCodes(5);
  assert.equal(codes.length, 5);
  const hash = await hashRecoveryCode(codes[0]);
  assert.equal(await verifyRecoveryCodeHash(codes[0], hash), true);
  assert.equal(await verifyRecoveryCodeHash(codes[0].toLowerCase(), hash), true);
  assert.equal(await verifyRecoveryCodeHash("XXXX-YYYY-ZZZZ", hash), false);
});

test("Server-backed sessions, atomic OTP, single-use grants, and admin MFA DB lifecycle", async () => {
  const suffix = randomBytes(4).toString("hex");
  const applicantPublicId = `TEST-${suffix.toUpperCase()}`;
  const applicantEmail = `sec-test-${suffix}@example.com`;
  const adminEmail = `sec-admin-${suffix}@example.com`;
  const accessCodeHash = await bcrypt.hash("TEST-CODE-9999", 10);
  const passwordHash = await bcrypt.hash("VeryStrongTestPass#2026!", 10);

  const applicant = await prisma.applicant.create({
    data: {
      publicId: applicantPublicId,
      accessCodeHash,
      name: "Security Test Applicant",
      email: applicantEmail,
      consulate: "Islamabad",
      approval: "PENDING_REVIEW",
    },
  });

  const admin = await prisma.adminUser.create({
    data: {
      email: adminEmail,
      passwordHash,
      totpSecretEnc: encryptTotpSecret(generateTotpSecret()),
      totpEnabledAt: new Date(),
    },
  });

  try {
    // 1. Server session creation, validation, revocation & replay rejection
    const s1 = await createServerSession({
      subjectType: "APPLICANT",
      applicantId: applicant.id,
      authMethod: "access_code",
    });
    const valid1 = await validateServerSession(s1.rawToken, "APPLICANT", { touch: false });
    assert.ok(valid1);
    assert.equal(valid1.applicantId, applicant.id);
    assert.equal(valid1.publicId, applicantPublicId);

    // Role separation: applicant token must NOT validate as ADMIN
    const crossRole = await validateServerSession(s1.rawToken, "ADMIN", { touch: false });
    assert.equal(crossRole, null);

    // Revoke session and verify replay fails immediately
    const revoked = await revokeServerSessionByToken(s1.rawToken, "TEST_LOGOUT");
    assert.equal(revoked, true);
    const replayed = await validateServerSession(s1.rawToken, "APPLICANT", { touch: false });
    assert.equal(replayed, null);

    // 2. Idle & absolute expiration enforcement
    const s2 = await createServerSession({
      subjectType: "APPLICANT",
      applicantId: applicant.id,
      authMethod: "email_otp",
    });
    await prisma.authSession.update({
      where: { id: s2.sessionId },
      data: { idleExpiresAt: new Date(Date.now() - 1000) },
    });
    assert.equal(await validateServerSession(s2.rawToken, "APPLICANT", { touch: false }), null);

    // 3. Admin session requires mfaVerifiedAt + totpEnabledAt
    const adminSessNoMfa = await createServerSession({
      subjectType: "ADMIN",
      adminUserId: admin.id,
      authMethod: "password",
      mfaVerifiedAt: null,
    });
    assert.equal(await validateServerSession(adminSessNoMfa.rawToken, "ADMIN", { touch: false }), null);

    const adminSessMfa = await createServerSession({
      subjectType: "ADMIN",
      adminUserId: admin.id,
      authMethod: "password+totp",
      mfaVerifiedAt: new Date(),
    });
    const validAdmin = await validateServerSession(adminSessMfa.rawToken, "ADMIN", { touch: false });
    assert.ok(validAdmin);
    assert.equal(validAdmin.adminUserId, admin.id);

    // 4. Revoke all sessions for subject
    const s3 = await createServerSession({
      subjectType: "APPLICANT",
      applicantId: applicant.id,
      authMethod: "access_code",
    });
    await revokeAllSessionsForSubject("APPLICANT", applicant.id, "ACCESS_CODE_RESET");
    assert.equal(await validateServerSession(s3.rawToken, "APPLICANT", { touch: false }), null);

    // 5. Single-use AuthGrant concurrency safety
    const grant = await createAuthGrant({
      purpose: "RECOVERY",
      email: applicantEmail,
      subjectIds: [applicant.id],
      ttlMs: 60_000,
    });
    const [g1, g2] = await Promise.all([
      consumeAuthGrant(grant.rawToken, "RECOVERY"),
      consumeAuthGrant(grant.rawToken, "RECOVERY"),
    ]);
    assert.equal([g1, g2].filter(Boolean).length, 1);

    // 6. Atomic OTP concurrency safety + purpose isolation
    const issued = await issueOtp({
      email: applicantEmail,
      purpose: "LOGIN",
      applicantId: applicant.id,
    });
    assert.equal(issued.ok, true);
    if (issued.ok) {
      // Wrong purpose must fail
      const wrongPurpose = await verifyOtp({
        email: applicantEmail,
        purpose: "RECOVERY",
        code: issued.code,
      });
      assert.equal(wrongPurpose.ok, false);

      // Concurrent verification of same valid code: exactly 1 succeeds
      const [v1, v2] = await Promise.all([
        verifyOtp({ email: applicantEmail, purpose: "LOGIN", code: issued.code }),
        verifyOtp({ email: applicantEmail, purpose: "LOGIN", code: issued.code }),
      ]);
      assert.equal([v1, v2].filter((r) => r.ok).length, 1);
    }
  } finally {
    await prisma.emailOtp.deleteMany({ where: { email: applicantEmail } }).catch(() => {});
    await prisma.authGrant.deleteMany({ where: { email: { in: [applicantEmail, adminEmail] } } }).catch(() => {});
    await prisma.applicant.delete({ where: { id: applicant.id } }).catch(() => {});
    await prisma.adminUser.delete({ where: { id: admin.id } }).catch(() => {});
  }
});
