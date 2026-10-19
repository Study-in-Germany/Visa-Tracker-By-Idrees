import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { parseCSV } from "@/lib/csv";
import { parseCalendarDay } from "@/lib/period";
import { generateAccessCode } from "@/lib/ids";
import { createApplicantWithTrackingId } from "@/lib/create-applicant";
import { CONSULATES, VISA_STATUS_LABELS, VISA_STATUS_ORDER, GENDER_LABELS } from "@/lib/constants";

const DATE_COLUMNS: Record<string, string> = {
  WaitingListDate: "waitingListDate",
  SubmissionInviteDate: "submissionInviteDate",
  DocumentSubmissionDate: "documentSubmissionDate",
  CorrectionRequestDate: "correctionRequestDate",
  CorrectionSubmittedDate: "correctionSubmittedDate",
  AppointmentDate: "appointmentDate",
  InterviewDate: "interviewDate",
  DecisionDate: "decisionDate",
};

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  const iso = parseCalendarDay(trimmed);
  if (iso) return iso;
  const d = new Date(trimmed);
  return isNaN(d.getTime()) || d.getUTCFullYear() < 2000 || d.getUTCFullYear() > 2100 ? null : d;
}

function matchConsulate(value: string | undefined): string {
  const found = CONSULATES.find(function (c) {
    return c.toLowerCase() === (value || "").trim().toLowerCase();
  });
  return found || CONSULATES[0];
}

function matchVisaStatus(value: string | undefined): string {
  const raw = (value || "").trim();
  if (!raw) return "WAITING_LIST";
  const byKey = VISA_STATUS_ORDER.find(function (k) {
    return k.toLowerCase() === raw.toLowerCase();
  });
  if (byKey) return byKey;
  const byLabel = Object.entries(VISA_STATUS_LABELS).find(function (entry) {
    return entry[1].toLowerCase() === raw.toLowerCase();
  });
  return byLabel ? byLabel[0] : "WAITING_LIST";
}

function matchGender(value: string | undefined): string | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  const validKeys = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"];
  const byKey = validKeys.find(function (k) {
    return k.toLowerCase() === raw.toLowerCase();
  });
  if (byKey) return byKey;
  const byLabel = Object.entries(GENDER_LABELS).find(function (entry) {
    return entry[1].toLowerCase() === raw.toLowerCase();
  });
  return byLabel ? byLabel[0] : null;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  const raw = (value || "").trim().toLowerCase();
  if (raw === "yes" || raw === "true" || raw === "1" || raw === "y") return true;
  if (raw === "no" || raw === "false" || raw === "0" || raw === "n") return false;
  return fallback;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData().catch(function () {
    return null;
  });
  const file = formData ? formData.get("file") : null;
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No CSV file uploaded" }, { status: 400 });
  }

  const text = await (file as File).text();
  const rows = parseCSV(text);

  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV file is empty or could not be read" }, { status: 400 });
  }
  if (rows.length > 2000) {
    return NextResponse.json(
      { error: "Too many rows in one file (max 2000). Split into smaller files." },
      { status: 400 }
    );
  }

  const results: Array<{ row: number; status: string; reason?: string; publicId?: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = (row["Name"] || "").trim();

    if (!name) {
      results.push({ row: i + 2, status: "skipped", reason: "Missing Name" });
      continue;
    }

    const consulate = matchConsulate(row["Consulate"]);
    const accessCode = generateAccessCode();
    const accessCodeHash = await bcrypt.hash(accessCode, 10);

    const dateFields: Record<string, Date | null> = {};
    for (const csvCol of Object.keys(DATE_COLUMNS)) {
      const field = DATE_COLUMNS[csvCol];
      dateFields[field] = parseDate(row[csvCol]);
    }

    try {
      const created = await createApplicantWithTrackingId({
        accessCodeHash: accessCodeHash,
        name: name,
        email: row["Email"] || null,
        gender: (matchGender(row["Gender"]) as any) || null,
        city: row["City"] || null,
        province: row["Province"] || null,
        university: row["University"] || null,
        program: row["Program"] || null,
        intake: row["Intake"] || null,
        visaType: row["VisaType"] || null,
        consulate: consulate,
        waitingListCategory: row["WaitingListCategory"] || null,
        sourceOfInformation: row["SourceOfInformation"] || null,
        additionalDocuments: row["AdditionalDocuments"] || null,
        isAnonymous: parseBool(row["Anonymous"], true),
        approval: "APPROVED",
        visaStatus: matchVisaStatus(row["VisaStatus"]) as any,
        waitingListDate: dateFields["waitingListDate"],
        submissionInviteDate: dateFields["submissionInviteDate"],
        documentSubmissionDate: dateFields["documentSubmissionDate"],
        correctionRequestDate: dateFields["correctionRequestDate"],
        correctionSubmittedDate: dateFields["correctionSubmittedDate"],
        appointmentDate: dateFields["appointmentDate"],
        interviewDate: dateFields["interviewDate"],
        decisionDate: dateFields["decisionDate"],
        history: {
          create: [
            {
              visaStatus: matchVisaStatus(row["VisaStatus"]) as any,
              note: "Imported via CSV",
            },
          ],
        },
      });
      results.push({ row: i + 2, status: "created", publicId: created.publicId });
    } catch {
      results.push({ row: i + 2, status: "skipped", reason: "Database error" });
    }
  }

  const createdCount = results.filter(function (r) {
    return r.status === "created";
  }).length;
  const skippedCount = results.filter(function (r) {
    return r.status === "skipped";
  }).length;

  return NextResponse.json({ createdCount: createdCount, skippedCount: skippedCount, results: results });
}
