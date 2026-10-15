import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { announcementSchema } from "@/lib/validations";

export async function GET() {
  const announcements = await prisma.announcement.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ announcements });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = announcementSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const announcement = await prisma.announcement.create({
    data: {
      title: data.title,
      body: data.body,
      consulate: data.consulate || null,
      pinned: !!data.pinned,
    },
  });
  return NextResponse.json({ announcement }, { status: 201 });
}
