import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { submitApplicantSchema } from "@/lib/validations";
import { getSession } from "@/lib/auth";
import { buildPublicId, generateAccessCode } from "@/lib/ids";
import bcrypt from "bcryptjs";

// GET /api/applicants — public dashboard data (approved only, unless admin)
export async function GET(req: NextRequest) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);

  const university = searchParams.get("university") || undefined;
  const visaStatus = searchParams.get("visaStatus") || undefined;
  const consulate = searchParams.get("consulate") || undefined;
  const q = searchParams.get("q") || undefined;
  const approvalParam = searchParams.get("approval") || undefined;

  const where: any = {};

  if (session) {
    if (approvalParam) where.approval = approvalParam;
  } else {
    where.approval = "APPROVED";
  }

  if (university) where.university = { contains: university, mode: "insensitive" };
  if (consulate) where.consulate = consulate;
  if (visaStatus) where.visaStatus = visaStatus;
  if (q) {
    where.OR = [
      { publicId: { contains: q, mode: "insensitive" } },
      ...(session ? [{ name: { contains: q, mode: "insensitive" } }] : []),
    ];
  }

  const applicants = await prisma.applicant.findMany({
    where,
    orderBy: [{ waitingListDate: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      publicId: true,
      name: true,
      university: true,
      program: true,
      intake: true,
      consulate: true,
      waitingListDate: true,
      submissionInviteDate: true,
      documentSubmissionDate: true,
      correctionRequestDate: true,
      correctionSubmittedDate: true,
      appointmentDate: true,
      interviewDate: true,
      decisionDate: true,
      visaStatus: true,
      approval: true,
      isAnonymous: true,
      createdAt: true,
    },
  });

  // Partially-anonymous privacy model: hide real name on public view.
  const display = applicants.map((a) => ({
    ...a,
    name: !session && a.isAnonymous ? null : a.name,
  }));

  return NextResponse.json({ applicants: display, count: display.length });
}

// POST /api/applicants — student self-submission (goes to PENDING_REVIEW)
// Returns the new public tracking ID + a private access code (shown once)
// so the applicant can log in later to manage their own entry.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = submitApplicantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const accessCode = generateAccessCode();
  const accessCodeHash = await bcrypt.hash(accessCode, 10);

  // Retry a couple of times in case of a rare publicId collision.
  let applicant = null;
  for (let attempt = 0; attempt < 5 && !applicant; attempt++) {
    const countForConsulate = await prisma.applicant.count({
      where: { consulate: data.consulate },
    });
    const candidateId = buildPublicId(data.consulate, 10000 + countForConsulate + attempt);
    try {
      applicant = await prisma.applicant.create({
        data: {
          publicId: candidateId,
          accessCodeHash,
          name: data.name,
          email: data.email || null,
          gender: (data.gender as any) || null,
          city: data.city || null,
          province: data.province || null,
          university: data.university || null,
          program: data.program || null,
          intake: data.intake || null,
          visaType: data.visaType || null,
          consulate: data.consulate,
          waitingListCategory: data.waitingListCategory || null,
          sourceOfInformation: data.sourceOfInformation || null,
          additionalDocuments: data.additionalDocuments || null,
          waitingListDate: data.waitingListDate ? new Date(data.waitingListDate) : null,
          submissionInviteDate: data.submissionInviteDate ? new Date(data.submissionInviteDate) : null,
          documentSubmissionDate: data.documentSubmissionDate ? new Date(data.documentSubmissionDate) : null,
          isAnonymous: data.isAnonymous ?? true,
          approval: "PENDING_REVIEW",
          visaStatus: "WAITING_LIST",
          // access code hash stored on the applicant record via a raw update below
          history: {
            create: [{ visaStatus: "WAITING_LIST", note: "Entry submitted by applicant" }],
          },
        },
      });
    } catch (err: any) {
      if (err?.code === "P2002") continue; // unique constraint clash, retry
      throw err;
    }
  }

  if (!applicant) {
    return NextResponse.json({ error: "Could not allocate a tracking ID, please try again" }, { status: 500 });
  }

  return NextResponse.json(
    {
      applicant,
      publicId: applicant.publicId,
      accessCode,
      message:
        "Save your Tracking ID and Access Code — you'll need both to log in and manage this entry later. They will not be shown again.",
    },
    { status: 201 }
  );
}
