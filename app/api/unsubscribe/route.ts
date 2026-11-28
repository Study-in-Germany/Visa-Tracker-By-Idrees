import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

async function unsubscribeByToken(token: string) {
  const clean = token.trim();
  if (!clean) return false;
  const res = await prisma.applicant.updateMany({
    where: { unsubscribeToken: clean },
    data: { notifyAnnouncements: false },
  });
  return res.count > 0;
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!token) return NextResponse.json({ error: "Missing unsubscribe token." }, { status: 400 });
  const ok = await unsubscribeByToken(token);
  if (!ok) return NextResponse.json({ error: "Invalid or expired unsubscribe link." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : new URL(req.url).searchParams.get("token") || "";
  if (!token) return NextResponse.json({ error: "Missing unsubscribe token." }, { status: 400 });
  const ok = await unsubscribeByToken(token);
  if (!ok) return NextResponse.json({ error: "Invalid or expired unsubscribe link." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
