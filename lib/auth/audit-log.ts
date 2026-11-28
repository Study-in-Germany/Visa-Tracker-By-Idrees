import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

const SENSITIVE_KEY_RE = /secret|password|token|otp|code|hash|authorization|cookie/i;

function sanitizeMetadata(obj: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEY_RE.test(k)) continue;
    if (v === undefined) continue;
    if (typeof v === "string") {
      out[k] = v.slice(0, 200);
    } else if (typeof v === "number" || typeof v === "boolean" || v === null) {
      out[k] = v;
    } else if (Array.isArray(v)) {
      out[k] = v.slice(0, 20).map((item) => (typeof item === "string" ? item.slice(0, 80) : item));
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export function getRequestIp(req?: NextRequest | Request | null): string {
  if (!req) return "unknown";
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function getRequestUserAgent(req?: NextRequest | Request | null): string | null {
  const ua = req?.headers.get("user-agent")?.trim();
  return ua ? ua.slice(0, 240) : null;
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip || ip === "unknown") return null;
  const secret = process.env.AUTH_SECRET || "fallback-audit-salt";
  return createHash("sha256").update(`${secret}:ip:${ip}`).digest("hex").slice(0, 24);
}

export async function logAuthEvent(input: {
  eventType: string;
  actorType: "APPLICANT" | "ADMIN" | "GUEST" | "SYSTEM";
  actorId?: string | null;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.authAuditLog.create({
      data: {
        eventType: input.eventType,
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        targetId: input.targetId ?? null,
        ipHash: hashIp(input.ip),
        userAgent: input.userAgent ? input.userAgent.slice(0, 240) : null,
        metadata: sanitizeMetadata(input.metadata) as any,
      },
    });
  } catch (err) {
    // Audit logging must never crash auth flows, but should surface a sanitized warning
    console.warn("[auth-audit] failed to persist event:", input.eventType, err instanceof Error ? err.message : "");
  }
}
