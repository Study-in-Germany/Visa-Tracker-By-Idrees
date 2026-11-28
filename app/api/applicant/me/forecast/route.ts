import { hasForecastDelegates, prisma } from "@/lib/db";
import { requireApplicant } from "@/lib/auth/authorization";
import { normalizeEmbassy } from "@/lib/forecasting/data-validation";
import { toIsoDay, toUtcDay } from "@/lib/forecasting/date-utils";
import { generatePersonalForecast, loadForecastDataset } from "@/lib/forecasting/forecast-service";
import { buildFrontierSeries } from "@/lib/forecasting/queue-velocity";
import { privateJson } from "@/lib/security/cache-policy";

export const dynamic = "force-dynamic";

// GET /api/applicant/me/forecast — personalized conditional forecast + chronological queue series for signed-in applicant
export async function GET() {
  const auth = await requireApplicant();
  if (!auth.ok) return auth.response;

  const applicant = await prisma.applicant.findUnique({
    where: { id: auth.session.applicantId },
    select: {
      id: true,
      publicId: true,
      consulate: true,
      visaType: true,
      visaStatus: true,
      waitingListDate: true,
      submissionInviteDate: true,
      documentSubmissionDate: true,
      correctionSubmittedDate: true,
      ...(hasForecastDelegates ? { appointmentInviteDate: true } : {}),
      appointmentDate: true,
      interviewDate: true,
      decisionDate: true,
    },
  });

  if (!applicant) return privateJson({ error: "Not found" }, { status: 404 });
  if (!applicant.waitingListDate) {
    return privateJson(
      {
        error: "Add your waiting-list joining date first to generate a personalized timeline forecast.",
        missingWaitingListDate: true,
      },
      { status: 200 }
    );
  }

  const embassy = normalizeEmbassy(applicant.consulate) ?? "Islamabad";
  const apptInviteDate = hasForecastDelegates
    ? (applicant as { appointmentInviteDate?: Date | null }).appointmentInviteDate ?? applicant.appointmentDate
    : applicant.appointmentDate;

  const asOf = toUtcDay(new Date());
  const [forecast, ds] = await Promise.all([
    generatePersonalForecast(
      {
        embassy,
        visaCategory: applicant.visaType || "Study",
        waitingListJoinedDate: applicant.waitingListDate,
        submissionInvitedDate: applicant.submissionInviteDate,
        documentsSubmittedDate: applicant.documentSubmissionDate,
        correctionSubmittedDate: applicant.correctionSubmittedDate,
        appointmentInvitedDate: apptInviteDate,
        appointmentBookedDate: applicant.appointmentDate,
        appointmentAttendedDate: applicant.interviewDate,
        decisionDate: applicant.decisionDate,
      },
      { applicantId: applicant.id, persistSnapshot: true }
    ),
    loadForecastDataset(asOf),
  ]);

  const series = buildFrontierSeries(embassy, "SUBMISSION_FRONTIER", ds.journeys, ds.queuePoints, asOf)
    .slice(-14)
    .map((pt) => ({
      date: toIsoDay(new Date(pt.obsMs))!,
      frontierDate: toIsoDay(new Date(pt.frontierMs))!,
      frontierMs: pt.frontierMs,
    }));

  return privateJson({ forecast, progressionHistory: series });
}
