import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApplicantSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

// GET /api/conversations — List active and pending conversations for the authenticated applicant
export async function GET() {
  const session = await getApplicantSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: { applicantId: session.applicantId },
      },
    },
    include: {
      participants: {
        include: {
          applicant: {
            select: {
              id: true,
              publicId: true,
              studentProfile: {
                select: {
                  id: true,
                  displayName: true,
                  university: true,
                  program: true,
                  visibility: true,
                  inGermany: true,
                  destinationCity: true,
                },
              },
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  // Calculate unread count for each conversation
  const items = await Promise.all(
    conversations.map(async (c) => {
      const myParticipant = c.participants.find((p) => p.applicantId === session.applicantId);
      const otherParticipant = c.participants.find((p) => p.applicantId !== session.applicantId);

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: c.id,
          senderId: { not: session.applicantId },
          createdAt: {
            gt: myParticipant?.lastReadAt || new Date(0),
          },
        },
      });

      const otherProfile = otherParticipant?.applicant.studentProfile;
      const otherDisplayName =
        otherProfile?.visibility === "ANONYMOUS"
          ? `Student #${otherProfile.id.slice(-4)}`
          : otherProfile?.displayName || "Student";

      return {
        id: c.id,
        status: c.status,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        lastMessageAt: c.lastMessageAt,
        unreadCount,
        lastMessage: c.messages[0]
          ? {
              id: c.messages[0].id,
              content: c.messages[0].content,
              createdAt: c.messages[0].createdAt,
              senderId: c.messages[0].senderId,
            }
          : null,
        otherParticipant: {
          applicantId: otherParticipant?.applicantId,
          publicId: otherParticipant?.applicant.publicId,
          displayName: otherDisplayName,
          university: otherProfile?.university,
          program: otherProfile?.program,
          destinationCity: otherProfile?.destinationCity,
          inGermany: otherProfile?.inGermany,
        },
      };
    })
  );

  return NextResponse.json({ items });
}

// POST /api/conversations — Initiate conversation or message request
export async function POST(req: NextRequest) {
  const session = await getApplicantSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Rate limit: max 10 conversation requests per hour
  if (!rateLimit(`conv_req:${session.applicantId}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many conversation requests. Please wait a while before contacting more students." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { recipientProfileId, recipientApplicantId } = body;

  let targetApplicantId = recipientApplicantId;
  if (!targetApplicantId && recipientProfileId) {
    const prof = await prisma.studentProfile.findUnique({
      where: { id: recipientProfileId },
      select: { applicantId: true, visibility: true, allowMessages: true },
    });
    if (!prof || prof.visibility === "PRIVATE" || !prof.allowMessages) {
      return NextResponse.json({ error: "This student is not accepting direct messages." }, { status: 403 });
    }
    targetApplicantId = prof.applicantId;
  }

  if (!targetApplicantId || targetApplicantId === session.applicantId) {
    return NextResponse.json({ error: "Invalid conversation recipient." }, { status: 400 });
  }

  // Check if blocked in either direction
  const blocked = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: session.applicantId, blockedId: targetApplicantId },
        { blockerId: targetApplicantId, blockedId: session.applicantId },
      ],
    },
  });

  if (blocked) {
    return NextResponse.json({ error: "Unable to contact this student." }, { status: 403 });
  }

  // Deterministic pair key ensures no duplicate 1-to-1 conversations
  const pairKey = [session.applicantId, targetApplicantId].sort().join(":");

  const conversation = await prisma.conversation.upsert({
    where: { pairKey },
    create: {
      pairKey,
      status: "PENDING",
      participants: {
        create: [
          { applicantId: session.applicantId },
          { applicantId: targetApplicantId },
        ],
      },
    },
    update: {},
    include: {
      participants: true,
    },
  });

  return NextResponse.json({
    conversationId: conversation.id,
    status: conversation.status,
  });
}
