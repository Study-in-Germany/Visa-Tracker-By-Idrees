import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApplicantSession } from "@/lib/auth";
import { updateApplicantSchema } from "@/lib/validations";
import { deriveVisaStatus } from "@/lib/status";
import { CACHE_TAGS, invalidateTags } from "@/lib/cache";

export async function GET() {
  const session = await getApplicantSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const applicant = await prisma.applicant.findUnique({
    where: { id: session.applicantId },
    include: { history: { orderBy: { occurredAt: "asc" } } },
  });
  if (!applicant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { accessCodeHash, ...safe } = applicant;
  return NextResponse.json(
    { applicant: safe },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

// Applicants can update their own contact/profile info and known dates,
// but cannot change their approval state or delete their history —
// only an admin can do that.
export async function PATCH(req: NextRequest) {
  const session = await getApplicantSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = updateApplicantSchema
    .omit({ approval: true, visaStatus: true, statusNote: true, notes: true })
    .safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const dateField = (v?: string | null) => (v === undefined ? undefined : v ? new Date(v) : null);

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

  const nextDates = {
    waitingListDate: data.waitingListDate !== undefined ? dateField(data.waitingListDate)! : existing.waitingListDate,
    submissionInviteDate: data.submissionInviteDate !== undefined ? dateField(data.submissionInviteDate)! : existing.submissionInviteDate,
    documentSubmissionDate: data.documentSubmissionDate !== undefined ? dateField(data.documentSubmissionDate)! : existing.documentSubmissionDate,
    correctionRequestDate: data.correctionRequestDate !== undefined ? dateField(data.correctionRequestDate)! : existing.correctionRequestDate,
    correctionSubmittedDate: data.correctionSubmittedDate !== undefined ? dateField(data.correctionSubmittedDate)! : existing.correctionSubmittedDate,
    appointmentDate: data.appointmentDate !== undefined ? dateField(data.appointmentDate)! : existing.appointmentDate,
    interviewDate: data.interviewDate !== undefined ? dateField(data.interviewDate)! : existing.interviewDate,
    decisionDate: data.decisionDate !== undefined ? dateField(data.decisionDate)! : existing.decisionDate,
  };
  const nextStatus = deriveVisaStatus(nextDates, existing.visaStatus);

  const updated = await prisma.applicant.update({
    where: { id: session.applicantId },
    data: {
      name: data.name ?? undefined,
      gender: (data.gender as any) ?? undefined,
      city: data.city ?? undefined,
      province: data.province ?? undefined,
      university: data.university ?? undefined,
      program: data.program ?? undefined,
      intake: data.intake ?? undefined,
      visaType: data.visaType ?? undefined,
      waitingListCategory: data.waitingListCategory ?? undefined,
      sourceOfInformation: data.sourceOfInformation ?? undefined,
      additionalDocuments: data.additionalDocuments ?? undefined,
      isAnonymous: data.isAnonymous ?? undefined,
      waitingListDate: dateField(data.waitingListDate),
      submissionInviteDate: dateField(data.submissionInviteDate),
      documentSubmissionDate: dateField(data.documentSubmissionDate),
      correctionRequestDate: dateField(data.correctionRequestDate),
      correctionSubmittedDate: dateField(data.correctionSubmittedDate),
      appointmentDate: dateField(data.appointmentDate),
      interviewDate: dateField(data.interviewDate),
      decisionDate: dateField(data.decisionDate),
      visaStatus: nextStatus,
    },
  });

  const { accessCodeHash, ...safe } = updated;
  invalidateTags(CACHE_TAGS.APPLICANTS);
  return NextResponse.json({ applicant: safe });
}
