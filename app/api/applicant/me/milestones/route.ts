import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApplicantSession } from "@/lib/auth";
import { milestoneSchema } from "@/lib/validations";
import { parseCalendarDay } from "@/lib/period";

// PATCH /api/applicant/me/milestones — set or clear one journey date and log it in the applicant's history.
export async function PATCH(req: NextRequest) {
  const session = await getApplicantSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = milestoneSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { milestone, date, note } = parsed.data;

  const existing = await prisma.applicant.findUnique({ where: { id: session.applicantId }, select: { visaStatus: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const value = date ? parseCalendarDay(date) : null;
  await prisma.applicant.update({
    where: { id: session.applicantId },
    data: {
      [milestone]: value,
      history: { create: { visaStatus: existing.visaStatus, milestone, eventDate: value, note: note || null } },
    },
  });
  return NextResponse.json({ ok: true });
}
