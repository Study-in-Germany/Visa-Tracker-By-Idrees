import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseCSV } from "@/lib/csv";
import { buildPublicId, generateAccessCode } from "@/lib/ids";
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
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function matchConsulate(value: string | undefined): string {
  const found = CONSULATES.find((c) => c.toLowerCase() === (value || "").trim().toLowerCase());
  return found || CONSULATES[0];
}

function matchVisaStatus(value: string | undefined): string {
  const raw = (value || "").trim();
  if (!raw) return "WAITING_LIST";
  const byKey = VISA_STATUS_ORDER.find((k) => k.toLowerCase() === raw.toLowerCase());
  if (byKey) return byKey;
  const byLabel = Object.entries(VISA_STATUS_LABELS).find(
    ([, label]) => label.toLowerCase() === raw.toLowerCase()
  );
  return byLabel ? byLabel[0] : "WAITING_LIST";
}

function matchGender(value: string | undefined): string | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  const byKey = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"].find(
    (k) => k.toLowerCase() === raw.toLowerCase()
  );
  if (byKey) return byKey;
  const byLabel = Object.entries(GENDER_LABELS).find(
    ([, label]) => label.toLowerCase() === raw.toLowerCase()
  );
  return byLabel ? byLabel[0] : null;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  const raw = (value || "").trim().toLowerCase();
  if (["yes", "true", "1", "y"].includes(raw)) return true;
  if (["no", "false", "0", "n"].includes(raw)) return false;
  return fallback;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No CSV file uploaded" }, { status: 400 });
  }

  const text = await (file as File).text();
  const rows = parseCSV(text);

  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV file is empty or could not be read" }, { status: 400 });
  }
  if (rows.length > 2000) {
    return NextResponse.json({ error: "Too many rows in one file (max 2000). Split into smaller files." }, { status: 400 });
  }

  const results: { row: number; status: "created" | "skipped"; reason?: string; publicId?: string }[] = [];

  // Track how many applicants exist per consulate so we can allocate
  // sequential tracking IDs without re-querying the DB on every row.
  const consulateCounts: Record<string, number> = {};
  for (const c of CONSULATES) {
    consulateCounts[c] = await prisma.applicant.count({ where: { consulate: c } });
  }

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
    for (const [csvCol, field] of Object.entries(DATE_COLUMNS)) {
      dateFields[field] = parseDate(row[csvCol]);
    }

    let created = null;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      const candidateId = buildPublicId(consulate, 10000 + consulateCounts[consulate] + attempt);
      try {
        created = await prisma.applicant.create({
          data: {
            publicId: candidateId,
            accessCodeHash,
            name,
            email: row["Email"] || null,
            gender: (matchGender(row["Gender"]) as any) || null,
            city: row["City"] || null,
            province: row["Province"] || null,
            university: row["University"] || null,
            program: row["Program"] || null,
            intake: row["Intake"] || null,
            visaType: row["VisaType"] || null,
            consulate,
            waitingListCategory: row["WaitingListCategory"] || null,
            sourceOfInformation: row["SourceOfInformation"] || null,
            additionalDocuments: row["AdditionalDocuments"] || null,
            isAnonymous: parseBool(row["Anonymous"], true),
            approval: "APPROVED",
            visaStatus: matchVisaStatus(row["VisaStatus"]) as any,
            ...dateFields,
            history: {
              create: [{ visaStatus: matchVisaStatus(row["VisaStatus"]) as any, note: "Imported via CSV" }],
            },
          },
        });
      } catch (err: any) {
        if (err?.code === "P2002") continue; // publicId collision, retry with next number
        results.push({ row: i + 2, status: "skipped", reason: "Database error" });
        break;
      }
    }

    if (created) {
      consulateCounts[consulate]++;
      results.push({ row: i + 2, status: "created", publicId: created.publicId });
    } else if (!results.find((r) => r.row === i + 2)) {
      results.push({ row: i + 2, status: "skipped", reason: "Could not allocate tracking ID" });
    }
  }

  const createdCount = results.filter((r) => r.status === "created").length;
  const skippedCount = results.filter((r) => r.status === "skipped").length;

  return NextResponse.json({ createdCount, skippedCount, results });
}
