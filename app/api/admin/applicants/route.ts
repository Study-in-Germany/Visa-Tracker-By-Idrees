import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { submitApplicantSchema } from "@/lib/validations";
import { generateAccessCode } from "@/lib/ids";
import { createApplicantWithTrackingId } from "@/lib/create-applicant";
import { apiError, forbidden, getActor, unauthorized } from "@/lib/permissions";
import { VISA_STATUS_LABELS } from "@/lib/constants";
import { z } from "zod";

const schema = submitApplicantSchema.extend({
  visaStatus: z.string().refine((v) => v in VISA_STATUS_LABELS, "Unknown status").optional(),
  approval: z.enum(["PENDING_REVIEW", "APPROVED", "REJECTED"]).optional(),
});

const day = (v?: string) => (v ? new Date(`${v}T00:00:00.000Z`) : null);

// POST /api/admin/applicants — an admin adds an applicant directly. Returns the access code once.
export async function POST(req: NextRequest) {
  const a = await getActor();
  if (a.role !== "admin") return a.role === "guest" ? unauthorized() : forbidden();

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  const accessCode = generateAccessCode();
  const accessCodeHash = await bcrypt.hash(accessCode, 10);
  const visaStatus = (d.visaStatus ?? "WAITING_LIST") as any;

  try {
    const created = await createApplicantWithTrackingId({
      accessCodeHash, name: d.name, email: d.email || null, gender: (d.gender as any) || null,
      city: d.city || null, province: d.province || null, university: d.university || null, program: d.program || null,
      intake: d.intake || null, visaType: d.visaType || null, consulate: d.consulate,
      waitingListCategory: d.waitingListCategory || null, sourceOfInformation: d.sourceOfInformation || null,
      additionalDocuments: d.additionalDocuments || null,
      waitingListDate: day(d.waitingListDate), submissionInviteDate: day(d.submissionInviteDate),
      documentSubmissionDate: day(d.documentSubmissionDate), appointmentDate: day(d.appointmentDate),
      decisionDate: day(d.decisionDate), isAnonymous: d.isAnonymous ?? false,
      approval: d.approval ?? "APPROVED", visaStatus,
      history: { create: [{ visaStatus, note: "Added by an administrator" }] },
    });
    return NextResponse.json({ id: created.id, publicId: created.publicId, accessCode }, { status: 201 });
  } catch (err) {
    console.error("Admin create applicant failed:", err);
    return apiError("Could not save the applicant.", 500);
  }
}
