import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApplicantSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getApplicantSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { reportedApplicantId, conversationId, messageId, reason } = body;

  if (!reportedApplicantId || !reason?.trim()) {
    return NextResponse.json({ error: "Reported user ID and reason are required." }, { status: 400 });
  }

  const report = await prisma.userReport.create({
    data: {
      reporterId: session.applicantId,
      reportedId: reportedApplicantId,
      conversationId: conversationId || null,
      messageId: messageId || null,
      reason: reason.trim().slice(0, 1000),
    },
  });

  return NextResponse.json({ ok: true, reportId: report.id });
}

