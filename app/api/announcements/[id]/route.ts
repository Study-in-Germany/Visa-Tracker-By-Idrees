import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/authorization";
import { announcementSchema } from "@/lib/validations";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = announcementSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const announcement = await prisma.announcement.update({
    where: { id: params.id },
    data: { ...parsed.data, ...(parsed.data.consulate !== undefined ? { consulate: parsed.data.consulate || null } : {}) },
  });
  revalidatePath("/");
  revalidatePath("/announcements");
  return NextResponse.json({ announcement });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  await prisma.announcement.delete({ where: { id: params.id } });
  revalidatePath("/");
  revalidatePath("/announcements");
  return NextResponse.json({ ok: true });
}
