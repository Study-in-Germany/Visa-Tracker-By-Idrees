import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApplicantSession } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getApplicantSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const targetApplicantId = params.id;
  if (targetApplicantId === session.applicantId) {
    return NextResponse.json({ error: "Cannot block yourself." }, { status: 400 });
  }

  // Toggle or add block
  const existing = await prisma.userBlock.findUnique({
    where: {
      blockerId_blockedId: {
        blockerId: session.applicantId,
        blockedId: targetApplicantId,
      },
    },
  });

  if (existing) {
    await prisma.userBlock.delete({
      where: {
        blockerId_blockedId: {
          blockerId: session.applicantId,
          blockedId: targetApplicantId,
        },
      },
    });
    return NextResponse.json({ ok: true, blocked: false });
  }

  await prisma.userBlock.create({
    data: {
      blockerId: session.applicantId,
      blockedId: targetApplicantId,
    },
  });

  return NextResponse.json({ ok: true, blocked: true });
}

