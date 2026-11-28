import test from "node:test";
import assert from "node:assert/strict";
import {
  generateSixDigitOtp,
  hashOtpCode,
  verifyOtpHash,
} from "../lib/otp";
import {
  announcementEmail,
  escapeHtml,
  loginOtpEmail,
  submissionConfirmationEmail,
} from "../lib/email/templates";

process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-key-for-unit-tests-only-1234";

test("generateSixDigitOtp produces 6 numeric digits", () => {
  for (let i = 0; i < 20; i++) {
    const code = generateSixDigitOtp();
    assert.match(code, /^\d{6}$/);
  }
});

test("hashOtpCode and verifyOtpHash bind code to normalized email and purpose", () => {
  const hash = hashOtpCode({
    email: "  Student@Example.COM ",
    purpose: "LOGIN",
    code: "482910",
  });

  assert.equal(
    verifyOtpHash({
      email: "student@example.com",
      purpose: "LOGIN",
      code: "482910",
      expectedHash: hash,
    }),
    true
  );

  // Wrong code
  assert.equal(
    verifyOtpHash({
      email: "student@example.com",
      purpose: "LOGIN",
      code: "000000",
      expectedHash: hash,
    }),
    false
  );

  // Wrong purpose
  assert.equal(
    verifyOtpHash({
      email: "student@example.com",
      purpose: "RECOVERY",
      code: "482910",
      expectedHash: hash,
    }),
    false
  );

  // Wrong email
  assert.equal(
    verifyOtpHash({
      email: "other@example.com",
      purpose: "LOGIN",
      code: "482910",
      expectedHash: hash,
    }),
    false
  );
});

test("Email templates escape untrusted HTML and never expose plaintext access codes", () => {
  assert.equal(escapeHtml(`<script>alert("x")</script>`), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");

  const otpMail = loginOtpEmail({ code: "123456", expiresMinutes: 5 });
  assert.ok(otpMail.html.includes("123456"));
  assert.ok(otpMail.text.includes("123456"));

  const subMail = submissionConfirmationEmail({
    name: `Ali <script>alert(1)</script>`,
    publicId: "PK-ISB-10001",
    consulate: "Islamabad",
    siteUrl: "https://example.com",
  });
  assert.equal(subMail.html.includes("<script>"), false);
  assert.ok(subMail.html.includes("&lt;script&gt;"));
  assert.ok(subMail.html.includes("never sent by email"));

  const annMail = announcementEmail({
    title: "Slots opened",
    body: "Line 1\n<img src=x onerror=alert(1)>",
    consulate: "Islamabad",
    siteUrl: "https://example.com",
    unsubscribeUrl: "https://example.com/unsubscribe?token=abc",
  });
  assert.equal(annMail.html.includes("<img src=x"), false);
  assert.ok(annMail.html.includes("not an official embassy communication"));
  assert.ok(annMail.html.includes("Unsubscribe from announcements"));
});

test("verifyOtpHash rejects whitespace-only or non-6-digit codes and handles email whitespace cleanly", () => {
  const hash = hashOtpCode({
    email: "student@example.com",
    purpose: "EMAIL_VERIFY",
    code: "004219",
  });

  assert.equal(
    verifyOtpHash({
      email: "  STUDENT@EXAMPLE.COM\n",
      purpose: "EMAIL_VERIFY",
      code: "004219",
      expectedHash: hash,
    }),
    true
  );
  assert.equal(
    verifyOtpHash({
      email: "student@example.com",
      purpose: "EMAIL_VERIFY",
      code: "4219",
      expectedHash: hash,
    }),
    false
  );
  assert.equal(
    verifyOtpHash({
      email: "student@example.com",
      purpose: "EMAIL_VERIFY",
      code: "      ",
      expectedHash: hash,
    }),
    false
  );
});
