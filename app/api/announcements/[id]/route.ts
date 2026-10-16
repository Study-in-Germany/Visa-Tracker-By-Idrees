import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/admin-session";
import { announcementSchema } from "@/lib/validations";
import { isRecordNotFound } from "@/lib/prisma-errors";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = announcementSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const announcement = await prisma.announcement.update({
    where: { id: params.id },
    data: parsed.data,
  }).catch((error: unknown) => {
    if (isRecordNotFound(error)) return null;
    throw error;
  });
  if (!announcement) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ announcement });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await prisma.announcement.deleteMany({ where: { id: params.id } });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
