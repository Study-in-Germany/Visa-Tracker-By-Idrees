import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { updateApplicantSchema } from "@/lib/validations";
import { sendStatusUpdateEmail } from "@/lib/email";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();

  const applicant = await prisma.applicant.findFirst({
    where: { OR: [{ id: params.id }, { publicId: params.id }] },
    include: {
      history: { orderBy: { occurredAt: "asc" } },
    },
  });

  if (!applicant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (applicant.approval !== "APPROVED" && !session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!session) {
    const { name, email, notes, accessCodeHash, ...rest } = applicant;
    return NextResponse.json({
      applicant: {
        ...rest,
        name: applicant.isAnonymous ? null : name,
      },
    });
  }

  return NextResponse.json({ applicant });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = updateApplicantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.applicant.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const statusChanged = data.visaStatus && data.visaStatus !== existing.visaStatus;
  const dateField = (v?: string | null) => (v === undefined ? undefined : v ? new Date(v) : null);

  const updated = await prisma.applicant.update({
    where: { id: params.id },
    data: {
      name: data.name ?? undefined,
      gender: (data.gender as any) ?? undefined,
      city: data.city ?? undefined,
      province: data.province ?? undefined,
      university: data.university ?? undefined,
      program: data.program ?? undefined,
      intake: data.intake ?? undefined,
      visaType: data.visaType ?? undefined,
      consulate: data.consulate ?? undefined,
      waitingListCategory: data.waitingListCategory ?? undefined,
      sourceOfInformation: data.sourceOfInformation ?? undefined,
      additionalDocuments: data.additionalDocuments ?? undefined,
      notes: data.notes ?? undefined,
      isAnonymous: data.isAnonymous ?? undefined,

      waitingListDate: dateField(data.waitingListDate),
      submissionInviteDate: dateField(data.submissionInviteDate),
      documentSubmissionDate: dateField(data.documentSubmissionDate),
      correctionRequestDate: dateField(data.correctionRequestDate),
      correctionSubmittedDate: dateField(data.correctionSubmittedDate),
      appointmentDate: dateField(data.appointmentDate),
      interviewDate: dateField(data.interviewDate),
      decisionDate: dateField(data.decisionDate),

      visaStatus: (data.visaStatus as any) ?? undefined,
      approval: data.approval ?? undefined,
      ...(statusChanged
        ? { history: { create: [{ visaStatus: data.visaStatus as any, note: data.statusNote || null }] } }
        : {}),
    },
  });

  if (statusChanged) {
    await sendStatusUpdateEmail({
      to: existing.email,
      name: existing.name,
      visaStatus: updated.visaStatus,
      note: data.statusNote,
    });
  }

  return NextResponse.json({ applicant: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.applicant.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
