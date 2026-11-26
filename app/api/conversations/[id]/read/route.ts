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
  const now = new Date();

  const participant = await prisma.conversationParticipant.update({
    where: {
      conversationId_applicantId: {
        conversationId,
        applicantId: session.applicantId,
      },
    },
    data: {
      lastReadAt: now,
    },
  });

  broadcastEvent({
    type: "message_read",
    conversationId,
    senderApplicantId: session.applicantId,
    payload: {
      conversationId,
      readerApplicantId: session.applicantId,
      lastReadAt: now.toISOString(),
    },
    timestamp: now.toISOString(),
  });

  return NextResponse.json({ ok: true, lastReadAt: participant.lastReadAt });
}
