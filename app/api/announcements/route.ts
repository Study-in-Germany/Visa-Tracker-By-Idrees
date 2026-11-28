import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/authorization";
import { announcementSchema } from "@/lib/validations";
import { enqueueAnnouncementEmails, processEmailQueue } from "@/lib/email";

export async function GET() {
  const announcements = await prisma.announcement.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ announcements });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = announcementSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  // Persist the announcement first so email delivery issues never lose the post
  const announcement = await prisma.announcement.create({
    data: {
      title: data.title,
      body: data.body,
      consulate: data.consulate || null,
      pinned: !!data.pinned,
    },
  });

  let queuedCount = 0;
  let sentNow = 0;
  try {
    const queued = await enqueueAnnouncementEmails(announcement);
    queuedCount = queued.queuedCount;
    if (queuedCount > 0) {
      // Send a fast bounded slice immediately while leaving remaining jobs durably queued
      const processed = await processEmailQueue({ limit: 10, maxDurationMs: 4_000 });
      sentNow = processed.sent;
    }
  } catch (err) {
    console.error("[announcements] email queue dispatch failed:", err);
  }

  revalidatePath("/");
  revalidatePath("/announcements");
  return NextResponse.json(
    {
      announcement,
      emailQueue: { queuedCount, sentNow, remaining: Math.max(0, queuedCount - sentNow) },
    },
    { status: 201 }
  );
}
