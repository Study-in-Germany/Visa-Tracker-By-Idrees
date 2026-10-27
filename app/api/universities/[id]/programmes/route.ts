import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, forbidden, getActor, unauthorized } from "@/lib/permissions";
import { programmeSchema } from "@/lib/validations";
import { dayOrNull, toProgrammeDto } from "@/lib/universities";
import { extraProgrammeData } from "@/lib/programmes";

// POST /api/universities/:id/programmes — admin only.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor();
  if (actor.role !== "admin") return actor.role === "guest" ? unauthorized() : forbidden();
  const parsed = programmeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  if (!(await prisma.university.findUnique({ where: { id: params.id }, select: { id: true } }))) return apiError("University not found.", 404);

  const programme = await prisma.programme.create({
    data: {
      universityId: params.id, name: d.name, degreeLevel: d.degreeLevel, language: d.language || null,
      intakes: d.intakes, summerDeadline: dayOrNull(d.summerDeadline), winterDeadline: dayOrNull(d.winterDeadline),
      website: d.website || null, published: d.published ?? true,
      deadlinesVerifiedAt: d.markVerified ? new Date() : null,
      verification: d.markVerified ? "VERIFIED" : "UNVERIFIED",
      lastCheckedAt: d.markVerified ? new Date() : null,
      ...(extraProgrammeData(d) as object),
    },
  });
  return NextResponse.json({ programme: toProgrammeDto(programme) }, { status: 201 });
}
