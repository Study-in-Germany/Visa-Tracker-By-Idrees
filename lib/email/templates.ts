export type EmailPayload = {
  subject: string;
  html: string;
  text: string;
};

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSiteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

function renderLayout(opts: {
  preheader: string;
  title: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
  footerNote: string;
  unsubscribeUrl?: string;
}): string {
  const ctaHtml = opts.cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px 0;">
        <tr>
          <td style="border-radius:8px;background-color:#0f172a;">
            <a href="${escapeHtml(opts.cta.href)}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
              ${escapeHtml(opts.cta.label)}
            </a>
          </td>
        </tr>
      </table>`
    : "";

  const unsubHtml = opts.unsubscribeUrl
    ? ` &middot; <a href="${escapeHtml(opts.unsubscribeUrl)}" style="color:#475569;text-decoration:underline;">Unsubscribe from announcements</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:20px 28px;border-bottom:1px solid #e2e8f0;background-color:#ffffff;">
              <span style="font-size:15px;font-weight:700;letter-spacing:-0.01em;color:#0f172a;">Visa Tracker</span>
              <span style="font-size:12px;font-weight:500;color:#64748b;margin-left:6px;">by Idrees</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 14px 0;font-size:20px;line-height:1.3;font-weight:700;color:#0f172a;">${escapeHtml(opts.title)}</h1>
              <div style="font-size:14px;line-height:1.6;color:#334155;">
                ${opts.bodyHtml}
              </div>
              ${ctaHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;border-top:1px solid #e2e8f0;background-color:#f8fafc;font-size:12px;line-height:1.5;color:#64748b;">
              ${escapeHtml(opts.footerNote)}${unsubHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function otpCodeBox(code: string): string {
  return `<div style="margin:20px 0;padding:16px 20px;border:1px solid #cbd5e1;border-radius:10px;background-color:#f8fafc;text-align:center;">
    <span style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:28px;font-weight:700;letter-spacing:0.25em;color:#0f172a;">${escapeHtml(code)}</span>
  </div>`;
}

export function loginOtpEmail(opts: { code: string; expiresMinutes: number }): EmailPayload {
  const subject = `${opts.code} is your Visa Tracker sign-in code`;
  const text = `Use this 6-digit verification code to sign in to Visa Tracker:\n\n${opts.code}\n\nThis code expires in ${opts.expiresMinutes} minutes. If you did not request it, you can ignore this email.`;
  const html = renderLayout({
    preheader: `Your Visa Tracker sign-in code is ${opts.code}`,
    title: "Sign in verification code",
    bodyHtml: `
      <p style="margin:0 0 12px 0;">Enter the 6-digit code below to sign in to your Visa Tracker applicant account:</p>
      ${otpCodeBox(opts.code)}
      <p style="margin:0;color:#475569;font-size:13px;">This code expires in <strong>${opts.expiresMinutes} minutes</strong> and can only be used once. Never share this code with anyone.</p>
    `,
    footerNote: "If you did not request a sign-in code, no action is needed.",
  });
  return { subject, html, text };
}

export function recoveryOtpEmail(opts: { code: string; expiresMinutes: number }): EmailPayload {
  const subject = `${opts.code} — Reset your Visa Tracker access code`;
  const text = `Use this 6-digit verification code to reset your Visa Tracker access code:\n\n${opts.code}\n\nThis code expires in ${opts.expiresMinutes} minutes. If you did not request a reset, ignore this email.`;
  const html = renderLayout({
    preheader: `Access code reset verification: ${opts.code}`,
    title: "Reset your access code",
    bodyHtml: `
      <p style="margin:0 0 12px 0;">We received a request to reset the access code for your Visa Tracker entry. Enter this verification code to continue:</p>
      ${otpCodeBox(opts.code)}
      <p style="margin:0;color:#475569;font-size:13px;">This code expires in <strong>${opts.expiresMinutes} minutes</strong>. If you did not request a reset, your existing access code remains unchanged.</p>
    `,
    footerNote: "Account security notification from Visa Tracker.",
  });
  return { subject, html, text };
}

export function emailVerificationOtpEmail(opts: { code: string; expiresMinutes: number }): EmailPayload {
  const subject = `${opts.code} — Verify your email address`;
  const text = `Confirm your email address for Visa Tracker using this 6-digit code:\n\n${opts.code}\n\nThis code expires in ${opts.expiresMinutes} minutes.`;
  const html = renderLayout({
    preheader: `Email verification code: ${opts.code}`,
    title: "Verify your email address",
    bodyHtml: `
      <p style="margin:0 0 12px 0;">Enter this 6-digit code in your account settings to verify this email address for sign-in and updates:</p>
      ${otpCodeBox(opts.code)}
      <p style="margin:0;color:#475569;font-size:13px;">This code expires in <strong>${opts.expiresMinutes} minutes</strong>.</p>
    `,
    footerNote: "You requested to link this email address to your Visa Tracker entry.",
  });
  return { subject, html, text };
}

export function accessCodeResetConfirmationEmail(opts: { publicId: string; siteUrl?: string }): EmailPayload {
  const base = opts.siteUrl || getSiteUrl();
  const subject = `Your access code was updated (${opts.publicId})`;
  const text = `Your Visa Tracker access code for ${opts.publicId} was just changed.\n\nSign in at ${base}/login\n\nIf you did not make this change, contact the site administrator immediately.`;
  const html = renderLayout({
    preheader: `Access code updated for ${opts.publicId}`,
    title: "Access code updated",
    bodyHtml: `
      <p style="margin:0 0 12px 0;">The access code for your Visa Tracker entry <strong>${escapeHtml(opts.publicId)}</strong> has been updated successfully.</p>
      <p style="margin:0;color:#475569;font-size:13px;">If you did not authorize this change, please contact a community administrator right away.</p>
    `,
    cta: { label: "Open Visa Tracker", href: `${base}/login` },
    footerNote: "Account security notification from Visa Tracker.",
  });
  return { subject, html, text };
}

export function emailChangedSecurityAlertEmail(opts: { publicId: string; siteUrl?: string }): EmailPayload {
  const base = opts.siteUrl || getSiteUrl();
  const subject = `Security notice: email updated for ${opts.publicId}`;
  const text = `The registered email address for Visa Tracker entry ${opts.publicId} was just changed.\n\nIf you did not authorize this change, sign in with your access code at ${base}/login or contact the site administrator immediately.`;
  const html = renderLayout({
    preheader: `Email address changed for ${opts.publicId}`,
    title: "Account email address changed",
    bodyHtml: `
      <p style="margin:0 0 12px 0;">The registered email address on your Visa Tracker entry <strong>${escapeHtml(opts.publicId)}</strong> was updated and verified.</p>
      <p style="margin:0;color:#475569;font-size:13px;">If you did not authorize this change, please review your account immediately or contact a community administrator.</p>
    `,
    cta: { label: "Review account", href: `${base}/login` },
    footerNote: "Account security notification from Visa Tracker.",
  });
  return { subject, html, text };
}

export function submissionConfirmationEmail(opts: {
  name: string;
  publicId: string;
  consulate: string;
  siteUrl?: string;
}): EmailPayload {
  const base = opts.siteUrl || getSiteUrl();
  const subject = `Entry received: ${opts.publicId}`;
  const text = `Hi ${opts.name},\n\nYour Visa Tracker entry (${opts.publicId}, ${opts.consulate} embassy) has been submitted and is pending review.\n\nKeep the access code shown on screen when you submitted, or sign in with your verified email code at ${base}/login.\n\nOnce approved by an admin, your entry will appear on the public tracker.`;
  const html = renderLayout({
    preheader: `Your entry ${opts.publicId} has been received`,
    title: "Your entry has been received",
    bodyHtml: `
      <p style="margin:0 0 12px 0;">Hi ${escapeHtml(opts.name)},</p>
      <p style="margin:0 0 14px 0;">Your visa timeline has been submitted and queued for admin review.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:8px;background-color:#f8fafc;margin-bottom:14px;">
        <tr>
          <td style="padding:12px 16px;font-size:13px;color:#475569;">Tracking ID</td>
          <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#0f172a;text-align:right;font-family:monospace;">${escapeHtml(opts.publicId)}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border-top:1px solid #e2e8f0;font-size:13px;color:#475569;">Embassy</td>
          <td style="padding:12px 16px;border-top:1px solid #e2e8f0;font-size:13px;font-weight:600;color:#0f172a;text-align:right;">${escapeHtml(opts.consulate)}</td>
        </tr>
      </table>
      <p style="margin:0;color:#475569;font-size:13px;">For security, your access code is never sent by email. You can sign in anytime using your Tracking ID and access code, or via email OTP.</p>
    `,
    cta: { label: "Sign in to your entry", href: `${base}/login` },
    footerNote: "Community-run German student visa tracker. Not affiliated with any embassy.",
  });
  return { subject, html, text };
}

export function approvalNotificationEmail(opts: {
  name: string;
  publicId: string;
  approved: boolean;
  siteUrl?: string;
}): EmailPayload {
  const base = opts.siteUrl || getSiteUrl();
  const subject = opts.approved
    ? `Your Visa Tracker entry is now live (${opts.publicId})`
    : `Update on your Visa Tracker submission (${opts.publicId})`;
  const text = opts.approved
    ? `Hi ${opts.name},\n\nYour Visa Tracker entry (${opts.publicId}) has been approved and is now included in the public tracker.\n\nView your public page: ${base}/tracker/${opts.publicId}`
    : `Hi ${opts.name},\n\nYour Visa Tracker entry (${opts.publicId}) could not be approved for the public tracker. Sign in to review your entry details at ${base}/login.`;

  const html = renderLayout({
    preheader: opts.approved ? `Entry ${opts.publicId} approved` : `Review update for ${opts.publicId}`,
    title: opts.approved ? "Your entry is approved" : "Submission review update",
    bodyHtml: opts.approved
      ? `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(opts.name)},</p>
         <p style="margin:0 0 12px 0;">Your entry <strong>${escapeHtml(opts.publicId)}</strong> has been reviewed and approved. It is now visible on the public tracker and included in community queue statistics.</p>`
      : `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(opts.name)},</p>
         <p style="margin:0 0 12px 0;">Your submission <strong>${escapeHtml(opts.publicId)}</strong> was not approved for the public tracker. You can sign in to review or update your timeline details.</p>`,
    cta: opts.approved
      ? { label: "View your public timeline", href: `${base}/tracker/${encodeURIComponent(opts.publicId)}` }
      : { label: "Sign in to dashboard", href: `${base}/login` },
    footerNote: "Community-run German student visa tracker. Not affiliated with any embassy.",
  });
  return { subject, html, text };
}

export function statusUpdateEmail(opts: {
  name: string;
  publicId: string;
  visaStatusLabel: string;
  note?: string | null;
  siteUrl?: string;
  unsubscribeUrl?: string;
}): EmailPayload {
  const base = opts.siteUrl || getSiteUrl();
  const subject = `Status update for ${opts.publicId}: ${opts.visaStatusLabel}`;
  const text = `Hi ${opts.name},\n\nYour Visa Tracker entry (${opts.publicId}) status was updated to: ${opts.visaStatusLabel}.${opts.note ? `\n\nNote: ${opts.note}` : ""}\n\nView details: ${base}/dashboard`;
  const html = renderLayout({
    preheader: `${opts.publicId} status changed to ${opts.visaStatusLabel}`,
    title: `Application status updated`,
    bodyHtml: `
      <p style="margin:0 0 12px 0;">Hi ${escapeHtml(opts.name)},</p>
      <p style="margin:0 0 12px 0;">Your tracked entry <strong>${escapeHtml(opts.publicId)}</strong> status was updated to:</p>
      <p style="margin:0 0 14px 0;padding:10px 14px;border:1px solid #cbd5e1;border-radius:8px;background-color:#f8fafc;font-size:15px;font-weight:700;color:#0f172a;">${escapeHtml(opts.visaStatusLabel)}</p>
      ${opts.note ? `<p style="margin:0 0 12px 0;color:#475569;font-size:13px;"><strong>Admin note:</strong> ${escapeHtml(opts.note)}</p>` : ""}
    `,
    cta: { label: "View your journey", href: `${base}/dashboard` },
    footerNote: "You received this update for your tracked Visa Tracker entry.",
    unsubscribeUrl: opts.unsubscribeUrl,
  });
  return { subject, html, text };
}

export function announcementEmail(opts: {
  title: string;
  body: string;
  consulate?: string | null;
  siteUrl?: string;
  unsubscribeUrl?: string;
}): EmailPayload {
  const base = opts.siteUrl || getSiteUrl();
  const scopeLabel = opts.consulate ? `${opts.consulate} embassy` : "All embassies";
  const subject = `Community announcement: ${opts.title}`;
  const text = `[${scopeLabel} — Community Announcement]\n\n${opts.title}\n\n${opts.body}\n\nNote: This is a community update shared on Visa Tracker, not an official embassy notice.\n\nRead on Visa Tracker: ${base}/announcements${opts.unsubscribeUrl ? `\nUnsubscribe: ${opts.unsubscribeUrl}` : ""}`;
  const formattedBody = escapeHtml(opts.body).replace(/\r?\n/g, "<br />");

  const html = renderLayout({
    preheader: `${scopeLabel}: ${opts.title}`,
    title: opts.title,
    bodyHtml: `
      <p style="margin:0 0 12px 0;">
        <span style="display:inline-block;padding:3px 8px;border-radius:6px;background-color:#f1f5f9;border:1px solid #e2e8f0;font-size:11px;font-weight:600;color:#334155;">
          Community update &middot; ${escapeHtml(scopeLabel)}
        </span>
      </p>
      <div style="margin:0 0 14px 0;color:#1e293b;font-size:14px;line-height:1.65;">${formattedBody}</div>
      <p style="margin:0;padding:10px 12px;border-radius:8px;background-color:#f8fafc;border:1px solid #e2e8f0;font-size:12px;color:#475569;">
        Community-shared update from Visa Tracker admins — not an official embassy communication.
      </p>
    `,
    cta: { label: "View announcements", href: `${base}/announcements` },
    footerNote: "You are subscribed to Visa Tracker community announcements.",
    unsubscribeUrl: opts.unsubscribeUrl,
  });
  return { subject, html, text };
}
