import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generatePersonalForecast } from "@/lib/forecasting/forecast-service";
import { parseCalendarDay } from "@/lib/period";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const dayField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter date as YYYY-MM-DD")
  .refine((v) => parseCalendarDay(v) !== null, "Enter a valid calendar date")
  .optional()
  .or(z.literal(""));

const forecastRequestSchema = z.object({
  embassy: z.enum(["Islamabad", "Karachi"]),
  visaCategory: z.string().trim().max(60).optional(),
  waitingListJoinedDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Waiting-list joining date is required (YYYY-MM-DD)")
    .refine((v) => {
      const dt = parseCalendarDay(v);
      return dt !== null && dt.getUTCFullYear() >= 2020;
    }, "Enter a valid waiting-list joining date (2020 or later)"),
  submissionInvitedDate: dayField,
  documentsSubmittedDate: dayField,
  correctionSubmittedDate: dayField,
  appointmentInvitedDate: dayField,
  appointmentBookedDate: dayField,
  appointmentAttendedDate: dayField,
  decisionDate: dayField,
  expectedSubmissionDelayDays: z.number().int().min(0).max(90).optional(),
});

const toDay = (v?: string) => (v ? parseCalendarDay(v) : null);

// POST /api/forecast — public timeline calculator (never stores user data or creates accounts)
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`public-forecast:${ip}`, 60, 5 * 60_000)) {
    return NextResponse.json({ error: "Too many calculation requests. Please wait a moment." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = forecastRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const wl = parseCalendarDay(d.waitingListJoinedDate)!;

  try {
    const forecast = await generatePersonalForecast({
      embassy: d.embassy,
      visaCategory: d.visaCategory || "Study",
      waitingListJoinedDate: wl,
      submissionInvitedDate: toDay(d.submissionInvitedDate),
      documentsSubmittedDate: toDay(d.documentsSubmittedDate),
      correctionSubmittedDate: toDay(d.correctionSubmittedDate),
      appointmentInvitedDate: toDay(d.appointmentInvitedDate),
      appointmentBookedDate: toDay(d.appointmentBookedDate),
      appointmentAttendedDate: toDay(d.appointmentAttendedDate),
      decisionDate: toDay(d.decisionDate),
      expectedSubmissionDelayDays: d.expectedSubmissionDelayDays ?? null,
    });
    return NextResponse.json({ forecast }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/forecast] failed:", err);
    return NextResponse.json({ error: "Could not compute timeline forecast." }, { status: 500 });
  }
}
