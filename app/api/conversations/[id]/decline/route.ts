import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApplicantSession } from "@/lib/auth";
import { broadcastEvent } from "@/lib/realtime";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getApplicantSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const conversationId = params.id;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: true },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const isMember = conversation.participants.some(
    (p) => p.applicantId === session.applicantId
  );
  if (!isMember) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: "DECLINED" },
  });

  broadcastEvent({
    type: "conversation_updated",
    conversationId,
    payload: { status: "DECLINED" },
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, status: updated.status });
}

