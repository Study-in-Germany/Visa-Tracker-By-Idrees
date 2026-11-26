import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApplicantSession } from "@/lib/auth";

// GET /api/connect/profile — Retrieve current applicant profile and linked tracker defaults
export async function GET() {
  const session = await getApplicantSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please sign in with your applicant access code." }, { status: 401 });
  }

  const applicant = await prisma.applicant.findUnique({
    where: { id: session.applicantId },
    select: {
      id: true,
      publicId: true,
      name: true,
      university: true,
      program: true,
      city: true,
      consulate: true,
      visaStatus: true,
      studentProfile: true,
    },
  });

  if (!applicant) {
    return NextResponse.json({ error: "Applicant not found." }, { status: 404 });
  }

  return NextResponse.json({
    profile: applicant.studentProfile,
    trackerDefaults: {
      suggestedName: applicant.name,
      university: applicant.university,
      program: applicant.program,
      originCity: applicant.city,
      consulate: applicant.consulate,
      visaStatus: applicant.visaStatus,
    },
  });
}

// POST /api/connect/profile — Create or update student networking profile
export async function POST(req: NextRequest) {
  const session = await getApplicantSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const {
    displayName,
    university,
    program,
    degreeLevel,
    intakeSeason,
    intakeYear,
    originCity,
    destinationCity,
    consulate,
    visaStatus,
    inGermany,
    bio,
    visibility = "NAMED",
    allowMessages = true,
    showEmail = false,
  } = body;

  const trimmedName = displayName?.trim();
  if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 50) {
    return NextResponse.json({ error: "Display name must be between 2 and 50 characters." }, { status: 400 });
  }

  if (bio && bio.length > 300) {
    return NextResponse.json({ error: "Bio cannot exceed 300 characters." }, { status: 400 });
  }

  const validVisibilities = ["NAMED", "ANONYMOUS", "PRIVATE"];
  if (!validVisibilities.includes(visibility)) {
    return NextResponse.json({ error: "Invalid profile visibility setting." }, { status: 400 });
  }

  const parsedYear = intakeYear ? parseInt(intakeYear) || null : null;

  const profile = await prisma.studentProfile.upsert({
    where: { applicantId: session.applicantId },
    create: {
      applicantId: session.applicantId,
      displayName: trimmedName,
      university: university?.trim() || null,
      program: program?.trim() || null,
      degreeLevel: degreeLevel?.trim() || null,
      intakeSeason: intakeSeason?.trim() || null,
      intakeYear: parsedYear,
      originCity: originCity?.trim() || null,
      destinationCity: destinationCity?.trim() || null,
      consulate: consulate?.trim() || null,
      visaStatus: visaStatus || null,
      inGermany: Boolean(inGermany),
      bio: bio?.trim() || null,
      visibility,
      allowMessages: Boolean(allowMessages),
      showEmail: Boolean(showEmail),
    },
    update: {
      displayName: trimmedName,
      university: university?.trim() || null,
      program: program?.trim() || null,
      degreeLevel: degreeLevel?.trim() || null,
      intakeSeason: intakeSeason?.trim() || null,
      intakeYear: parsedYear,
      originCity: originCity?.trim() || null,
      destinationCity: destinationCity?.trim() || null,
      consulate: consulate?.trim() || null,
      visaStatus: visaStatus || null,
      inGermany: Boolean(inGermany),
      bio: bio?.trim() || null,
      visibility,
      allowMessages: Boolean(allowMessages),
      showEmail: Boolean(showEmail),
    },
  });

  return NextResponse.json({ profile });
}

// DELETE /api/connect/profile — Remove or hide student networking profile
export async function DELETE() {
  const session = await getApplicantSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await prisma.studentProfile.deleteMany({
    where: { applicantId: session.applicantId },
  });

  return NextResponse.json({ ok: true });
}
