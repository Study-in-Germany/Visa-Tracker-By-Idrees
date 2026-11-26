import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApplicantSession } from "@/lib/auth";
import { milestoneSchema } from "@/lib/validations";
import { parseCalendarDay } from "@/lib/period";
import { deriveVisaStatus } from "@/lib/status";
import { CACHE_TAGS, invalidateTags } from "@/lib/cache";

// PATCH /api/applicant/me/milestones — set or clear one journey date and log it in the applicant's history.
export async function PATCH(req: NextRequest) {
  const session = await getApplicantSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = milestoneSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { milestone, date, note, outcome } = parsed.data;

  const existing = await prisma.applicant.findUnique({
    where: { id: session.applicantId },
    select: {
      visaStatus: true,
      waitingListDate: true,
      submissionInviteDate: true,
      documentSubmissionDate: true,
      correctionRequestDate: true,
      correctionSubmittedDate: true,
      appointmentDate: true,
      interviewDate: true,
      decisionDate: true,
    },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const value = date ? parseCalendarDay(date) : null;
  const explicitStatus = milestone === "decisionDate" && value && outcome ? outcome : existing.visaStatus;
  const nextStatus = deriveVisaStatus({ ...existing, [milestone]: value }, explicitStatus);

  await prisma.applicant.update({
    where: { id: session.applicantId },
    data: {
      [milestone]: value,
      visaStatus: nextStatus,
      history: { create: { visaStatus: nextStatus, milestone, eventDate: value, note: note || null } },
    },
  });
  invalidateTags(CACHE_TAGS.APPLICANTS);
  return NextResponse.json({ ok: true, visaStatus: nextStatus });
}
