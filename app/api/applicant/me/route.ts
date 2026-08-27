import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApplicantSession } from "@/lib/auth";
import { updateApplicantSchema } from "@/lib/validations";

export async function GET() {
  const session = await getApplicantSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const applicant = await prisma.applicant.findUnique({
    where: { id: session.applicantId },
    include: { history: { orderBy: { occurredAt: "asc" } } },
  });
  if (!applicant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { accessCodeHash, ...safe } = applicant;
  return NextResponse.json({ applicant: safe });
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
    },
  });

  const { accessCodeHash, ...safe } = updated;
  return NextResponse.json({ applicant: safe });
}
