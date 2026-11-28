import nodemailer, { type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function resolveSmtpConfig(): SmtpConfig | null {
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || "").trim();
  const pass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "").trim();
  if (!user || !pass) return null;

  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = Number(process.env.SMTP_PORT || "587") || 587;
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  const from = (process.env.SMTP_FROM || process.env.EMAIL_FROM || `"Visa Tracker" <${user}>`).trim();

  return { host, port, secure, user, pass, from };
}

const globalForMail = globalThis as unknown as {
  vtMailTransporter?: Transporter<SMTPTransport.SentMessageInfo>;
  vtMailConfigKey?: string;
};

export function isSmtpConfigured(): boolean {
  return resolveSmtpConfig() !== null;
}

export function getSenderAddress(): string {
  return resolveSmtpConfig()?.from || `"Visa Tracker" <noreply@visatracker.local>`;
}

export function getTransporter(): Transporter<SMTPTransport.SentMessageInfo> | null {
  const cfg = resolveSmtpConfig();
  if (!cfg) return null;

  const key = `${cfg.host}:${cfg.port}:${cfg.secure}:${cfg.user}`;
  if (globalForMail.vtMailTransporter && globalForMail.vtMailConfigKey === key) {
    return globalForMail.vtMailTransporter;
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    requireTLS: !cfg.secure,
    tls: {
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

  globalForMail.vtMailTransporter = transporter;
  globalForMail.vtMailConfigKey = key;
  return transporter;
}

export async function verifySmtpConnection(): Promise<{ ok: boolean; error?: string }> {
  const transporter = getTransporter();
  if (!transporter) {
    return { ok: false, error: "SMTP credentials are not configured." };
  }
  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "SMTP verification failed." };
  }
}

function isRetryableSmtpError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = String((err as { code?: unknown }).code ?? "");
  const responseCode = Number((err as { responseCode?: unknown }).responseCode ?? 0);
  if (["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EPIPE", "ESOCKET", "ENOTFOUND"].includes(code)) {
    return true;
  }
  return responseCode >= 400 && responseCode < 500;
}

export async function sendMailWithRetry(msg: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ messageId: string }> {
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error("SMTP credentials are not configured.");
  }

  const from = getSenderAddress();
  const delays = [400, 1000];

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const info = await transporter.sendMail({
        from,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      });
      return { messageId: info.messageId || "" };
    } catch (err) {
      if (attempt < delays.length && isRetryableSmtpError(err)) {
        await new Promise((r) => setTimeout(r, delays[attempt]));
        continue;
      }
      throw err;
    }
  }

  throw new Error("Failed to send email.");
}
