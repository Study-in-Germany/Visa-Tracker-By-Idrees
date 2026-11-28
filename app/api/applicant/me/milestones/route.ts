import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireApplicant } from "@/lib/auth/authorization";
import { milestoneSchema } from "@/lib/validations";
import { parseCalendarDay } from "@/lib/period";
import { invalidateForecastCache } from "@/lib/forecasting/forecast-service";
import { privateJson } from "@/lib/security/cache-policy";

// PATCH /api/applicant/me/milestones — set or clear one journey date and log it in the applicant's history.
export async function PATCH(req: NextRequest) {
  const auth = await requireApplicant();
  if (!auth.ok) return auth.response;

  const parsed = milestoneSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return privateJson({ error: parsed.error.flatten() }, { status: 400 });
  const { milestone, date, note } = parsed.data;

  const existing = await prisma.applicant.findUnique({
    where: { id: auth.session.applicantId },
    select: { visaStatus: true, publicId: true },
  });
  if (!existing) return privateJson({ error: "Not found" }, { status: 404 });

  const value = date ? parseCalendarDay(date) : null;
  await prisma.applicant.update({
    where: { id: auth.session.applicantId },
    data: {
      [milestone]: value,
      history: { create: { visaStatus: existing.visaStatus, milestone, eventDate: value, note: note || null } },
    },
  });
  invalidateForecastCache();
  revalidatePath("/");
  revalidatePath("/tracker");
  revalidatePath("/analytics");
  revalidatePath("/calculator");
  revalidatePath("/queue-progress");
  revalidatePath(`/tracker/${existing.publicId}`);
  return privateJson({ ok: true });
}
