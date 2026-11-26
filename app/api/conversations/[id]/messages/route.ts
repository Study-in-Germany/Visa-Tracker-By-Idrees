import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApplicantSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { broadcastEvent } from "@/lib/realtime";

// GET /api/conversations/[id]/messages — Get durable message history
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getApplicantSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const conversationId = params.id;

  // Verify membership
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_applicantId: {
        conversationId,
        applicantId: session.applicantId,
      },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const p = req.nextUrl.searchParams;
  const cursor = p.get("cursor");
  const limit = Math.min(100, Math.max(1, parseInt(p.get("limit") || "50")));
  const since = p.get("since");

  const where: any = { conversationId };

  if (since) {
    const sinceDate = new Date(since);
    if (!isNaN(sinceDate.getTime())) {
      where.createdAt = { gt: sinceDate };
    }
  }

  const messages = await prisma.message.findMany({
    where,
    take: limit + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      senderId: true,
      clientMessageId: true,
      content: true,
      createdAt: true,
    },
  });

  let nextCursor: string | null = null;
  let items = messages;
  if (messages.length > limit) {
    nextCursor = messages[messages.length - 1].id;
    items = messages.slice(0, limit);
  }

  return NextResponse.json({
    items: items.map((m) => ({
      ...m,
      isSelf: m.senderId === session.applicantId,
    })),
    nextCursor,
  });
}

// POST /api/conversations/[id]/messages — Persist message durably and broadcast
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getApplicantSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const conversationId = params.id;

  // Rate limiting: 30 messages per minute
  if (!rateLimit(`msg_send:${session.applicantId}`, 30, 60 * 1000)) {
    return NextResponse.json(
      { error: "Sending messages too fast. Please wait a moment." },
      { status: 429 }
    );
  }

  // Verify conversation and participants
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

  if (conversation.status === "DECLINED") {
    return NextResponse.json(
      { error: "This conversation request was declined." },
      { status: 403 }
    );
  }

  const otherParticipant = conversation.participants.find(
    (p) => p.applicantId !== session.applicantId
  );

  // Check if blocked
  if (otherParticipant) {
    const blocked = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: session.applicantId, blockedId: otherParticipant.applicantId },
          { blockerId: otherParticipant.applicantId, blockedId: session.applicantId },
        ],
      },
    });
    if (blocked) {
      return NextResponse.json({ error: "Cannot send messages to this user." }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const content = body.content?.trim();
  const clientMessageId = body.clientMessageId?.trim();

  if (!content || content.length < 1 || content.length > 4000) {
    return NextResponse.json(
      { error: "Message content must be between 1 and 4000 characters." },
      { status: 400 }
    );
  }

  if (!clientMessageId) {
    return NextResponse.json(
      { error: "clientMessageId is required for idempotency." },
      { status: 400 }
    );
  }

  // Idempotent insertion using unique compound constraint (senderId, clientMessageId)
  const message = await prisma.$transaction(async (tx) => {
    // If already exists, return existing record
    const existing = await tx.message.findUnique({
      where: {
        senderId_clientMessageId: {
          senderId: session.applicantId,
          clientMessageId,
        },
      },
    });
    if (existing) return existing;

    const created = await tx.message.create({
      data: {
        conversationId,
        senderId: session.applicantId,
        clientMessageId,
        content,
      },
    });

    // Update conversation lastMessageAt
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: created.createdAt },
    });

    // Update sender's lastReadAt
    await tx.conversationParticipant.update({
      where: {
        conversationId_applicantId: {
          conversationId,
          applicantId: session.applicantId,
        },
      },
      data: { lastReadAt: created.createdAt },
    });

    return created;
  });

  // Broadcast real-time event to recipient and conversation listeners
  broadcastEvent({
    type: "new_message",
    conversationId,
    senderApplicantId: session.applicantId,
    recipientApplicantId: otherParticipant?.applicantId,
    payload: {
      id: message.id,
      conversationId,
      senderId: message.senderId,
      clientMessageId: message.clientMessageId,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    },
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({
    id: message.id,
    clientMessageId: message.clientMessageId,
    createdAt: message.createdAt,
    status: "SENT",
  });
}
