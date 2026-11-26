import { NextResponse } from "next/server";
import { getApplicantSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Compatibility endpoint returning current authenticated applicant information
export async function GET() {
  const session = await getApplicantSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applicant = await prisma.applicant.findUnique({
    where: { id: session.applicantId },
    select: {
      id: true,
      name: true,
      consulate: true,
      waitingListDate: true,
      submissionInviteDate: true,
      visaStatus: true,
      university: true,
      program: true,
    },
  });

  if (!applicant) {
    return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...applicant,
    applicant,
  });
}

