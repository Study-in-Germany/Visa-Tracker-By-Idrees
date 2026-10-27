import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, forbidden, getActor, unauthorized } from "@/lib/permissions";
import { universitySchema } from "@/lib/validations";
import { toUniversityDto, uniqueSlug } from "@/lib/universities";

async function requireAdmin() {
  const actor = await getActor();
  if (actor.role === "admin") return null;
  return actor.role === "guest" ? unauthorized() : forbidden();
}

// GET /api/universities/:id — id or slug. Unpublished records are admin-only.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor();
  const university = await prisma.university.findFirst({
    where: { OR: [{ id: params.id }, { slug: params.id }] },
    include: { programmes: { orderBy: [{ degreeLevel: "asc" }, { name: "asc" }] } },
  });
  if (!university || (!university.published && actor.role !== "admin")) return apiError("University not found.", 404);
  if (actor.role !== "admin") university.programmes = university.programmes.filter((p) => p.published);
  return NextResponse.json({ university: toUniversityDto(university) });
}

// PATCH /api/universities/:id — admin only.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = universitySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  const existing = await prisma.university.findUnique({ where: { id: params.id } });
  if (!existing) return apiError("University not found.", 404);
  // Hand-edited fields are locked so a later import never overwrites them.
  const next: Record<string, unknown> = { name: d.name, city: d.city, state: d.state || null, website: d.website, description: d.description || null };
  const locked = new Set(existing.lockedFields);
  for (const [k, v] of Object.entries(next)) if ((existing as any)[k] !== v) locked.add(k);
  const university = await prisma.university.update({
    where: { id: existing.id },
    data: {
      name: d.name, city: d.city, state: d.state || null, website: d.website, description: d.description || null,
      published: d.published ?? undefined, lockedFields: [...locked],
      ...(d.name !== existing.name ? { slug: await uniqueSlug(d.name, existing.id) } : {}),
    },
    include: { programmes: true },
  });
  return NextResponse.json({ university: toUniversityDto(university) });
}

// DELETE /api/universities/:id — admin only; programmes go with it.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const existing = await prisma.university.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!existing) return apiError("University not found.", 404);
  await prisma.university.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
