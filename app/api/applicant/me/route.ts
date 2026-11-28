import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireApplicant } from "@/lib/auth/authorization";
import { updateApplicantSchema } from "@/lib/validations";
import { invalidateForecastCache } from "@/lib/forecasting/forecast-service";
import { privateJson } from "@/lib/security/cache-policy";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApplicant();
  if (!auth.ok) return auth.response;

  const applicant = await prisma.applicant.findUnique({
    where: { id: auth.session.applicantId },
    include: { history: { orderBy: { occurredAt: "asc" } } },
  });
  if (!applicant) return privateJson({ error: "Not found" }, { status: 404 });

  const { accessCodeHash, unsubscribeToken, sessionVersion: _sv, disabledAt: _da, ...safe } = applicant;
  return privateJson({ applicant: safe });
}

// Applicants can update their own contact/profile info and known dates,
// but cannot change their approval state or delete their history —
// only an admin can do that.
export async function PATCH(req: NextRequest) {
  const auth = await requireApplicant();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return privateJson({ error: "Invalid JSON" }, { status: 400 });

  const parsed = updateApplicantSchema
    .omit({ approval: true, visaStatus: true, statusNote: true, notes: true })
    .safeParse(body);
  if (!parsed.success) return privateJson({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const dateField = (v?: string | null) => (v === undefined ? undefined : v ? new Date(v) : null);
  const notifyAnnouncements = typeof body.notifyAnnouncements === "boolean" ? body.notifyAnnouncements : undefined;
  const notifyStatusUpdates = typeof body.notifyStatusUpdates === "boolean" ? body.notifyStatusUpdates : undefined;

  const updated = await prisma.applicant.update({
    where: { id: auth.session.applicantId },
    data: {
      name: data.name ?? undefined,
      gender: (data.gender as any) ?? undefined,
      city: data.city ?? undefined,
      province: data.province ?? undefined,
      university: data.university ?? undefined,
      program: data.program ?? undefined,
      intake: data.intake ?? undefined,
      visaType: data.visaType ?? undefined,
      waitingListCategory: data.waitingListCategory ?? undefined,
      sourceOfInformation: data.sourceOfInformation ?? undefined,
      additionalDocuments: data.additionalDocuments ?? undefined,
      isAnonymous: data.isAnonymous ?? undefined,
      notifyAnnouncements,
      notifyStatusUpdates,
      waitingListDate: dateField(data.waitingListDate),
      submissionInviteDate: dateField(data.submissionInviteDate),
      documentSubmissionDate: dateField(data.documentSubmissionDate),
      correctionRequestDate: dateField(data.correctionRequestDate),
      correctionSubmittedDate: dateField(data.correctionSubmittedDate),
      appointmentDate: dateField(data.appointmentDate),
      interviewDate: dateField(data.interviewDate),
      decisionDate: dateField(data.decisionDate),
    },
  });

  invalidateForecastCache();
  revalidatePath("/");
  revalidatePath("/tracker");
  revalidatePath("/analytics");
  revalidatePath(`/tracker/${updated.publicId}`);

  const { accessCodeHash, unsubscribeToken, sessionVersion: _sv, disabledAt: _da, ...safe } = updated;
  return privateJson({ applicant: safe });
}
