import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { apiError, forbidden, getActor, unauthorized } from "@/lib/permissions";
import { programmeSchema } from "@/lib/validations";
import { dayOrNull, toProgrammeDto } from "@/lib/universities";
import { changedKeys, extraProgrammeData, programmeInclude, toProgrammeDetail } from "@/lib/programmes";

async function requireAdmin() {
  const actor = await getActor();
  if (actor.role === "admin") return null;
  return actor.role === "guest" ? unauthorized() : forbidden();
}

// GET /api/programmes/:id — full admission details. Unpublished programmes are visible to admins only.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor();
  const p = await prisma.programme.findUnique({ where: { id: params.id }, include: programmeInclude });
  const hidden = !p || ((!p.published || p.verification === "NEEDS_REVIEW") && actor.role !== "admin");
  if (hidden) return apiError("Programme not found.", 404);
  return NextResponse.json({ programme: toProgrammeDetail(p!) });
}

// PATCH /api/programmes/:id — admin only. Changing a deadline without re-confirming it clears the "verified" stamp.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = programmeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  const existing = await prisma.programme.findUnique({ where: { id: params.id } });
  if (!existing) return apiError("Programme not found.", 404);

  const summerDeadline = dayOrNull(d.summerDeadline);
  const winterDeadline = dayOrNull(d.winterDeadline);
  const changed = summerDeadline?.getTime() !== existing.summerDeadline?.getTime() || winterDeadline?.getTime() !== existing.winterDeadline?.getTime();

  const locked = new Set(existing.lockedFields);
  const sameDay = (a: Date | null, b: Date | null) => (a?.getTime() ?? null) === (b?.getTime() ?? null);
  if (!sameDay(summerDeadline, existing.summerDeadline)) locked.add("summerDeadline");
  if (!sameDay(winterDeadline, existing.winterDeadline)) locked.add("winterDeadline");
  if ((d.language || null) !== existing.language) locked.add("language");
  if ((d.website || null) !== existing.website) locked.add("website");

  const extra = extraProgrammeData(d);
  for (const k of changedKeys(existing, extra as Record<string, unknown>)) locked.add(k);

  const programme = await prisma.programme.update({
    where: { id: existing.id },
    data: {
      name: d.name, degreeLevel: d.degreeLevel, language: d.language || null, intakes: d.intakes,
      summerDeadline, winterDeadline, website: d.website || null, published: d.published ?? undefined,
      ...(extra as object),
      lastCheckedAt: d.markVerified ? new Date() : undefined,
      lockedFields: [...locked], pendingChange: Prisma.DbNull,
      verification: d.markVerified ? "VERIFIED" : changed ? "UNVERIFIED" : undefined,
      deadlinesVerifiedAt: d.markVerified ? new Date() : changed ? null : undefined,
    },
  });
  return NextResponse.json({ programme: toProgrammeDto(programme) });
}

// DELETE /api/programmes/:id — admin only.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const existing = await prisma.programme.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!existing) return apiError("Programme not found.", 404);
  await prisma.programme.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
