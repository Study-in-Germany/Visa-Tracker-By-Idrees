import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { submitApplicantSchema } from "@/lib/validations";
import { getSession } from "@/lib/auth";
import { generateAccessCode } from "@/lib/ids";
import { createApplicantWithTrackingId } from "@/lib/create-applicant";
import bcrypt from "bcryptjs";
import { waitingListWhere } from "@/lib/period";
import { VISA_STATUS_LABELS } from "@/lib/constants";

const DATE_FIELDS = ["waitingListDate", "submissionInviteDate", "documentSubmissionDate", "correctionRequestDate", "correctionSubmittedDate", "appointmentDate", "interviewDate", "decisionDate"] as const;

// Accepts 2026-03-05, 05/03/2026 and 05-03-2026 (day first). Returns the UTC day range, or null.
function parseDayRange(q: string): { gte: Date; lt: Date } | null {
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(q);
  if (match) { y = +match[1]; m = +match[2]; d = +match[3]; }
  else if ((match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(q))) { d = +match[1]; m = +match[2]; y = +match[3]; }
  else return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const start = new Date(Date.UTC(y, m - 1, d));
  return { gte: start, lt: new Date(start.getTime() + 86400000) };
}

const SORTABLE = new Set(["publicId", "university", "consulate", "waitingListDate", "documentSubmissionDate", "appointmentDate", "visaStatus", "createdAt"]);

// GET /api/applicants — public dashboard data (approved only, unless admin)
export async function GET(req: NextRequest) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  const deletedOnly = searchParams.get("deleted") === "true";
  if (deletedOnly && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const university = searchParams.get("university") || undefined;
  const visaStatus = searchParams.get("visaStatus") || undefined;
  const consulate = searchParams.get("consulate") || undefined;
  const q = searchParams.get("q") || undefined;
  const approvalParam = searchParams.get("approval") || undefined;
  const month = searchParams.get("month") || undefined; // format: YYYY-MM, filters by waiting-list join month
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = Math.max(1, parseInt(searchParams.get("page") || "", 10) || 0);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "", 10) || 25));
  const sortParam = searchParams.get("sort") || "";
  const dir = searchParams.get("dir") === "desc" ? "desc" : "asc";

  const where: any = { deletedAt: deletedOnly ? { not: null } : null };

  if (session) {
    if (approvalParam) where.approval = approvalParam;
  } else {
    where.approval = "APPROVED";
  }

  if (university) where.university = { contains: university, mode: "insensitive" };
  if (consulate) where.consulate = consulate;
  if (visaStatus) where.visaStatus = visaStatus;
  if (month) {
    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;
    if (!isNaN(year) && !isNaN(monthIdx)) {
      const start = new Date(Date.UTC(year, monthIdx, 1));
      const end = new Date(Date.UTC(year, monthIdx + 1, 1));
      where.waitingListDate = { gte: start, lt: end };
    }
  }
  const range = waitingListWhere(from, to);
  if (range) where.waitingListDate = { ...(where.waitingListDate || {}), ...range };
  if (q) {
    const ci = { contains: q, mode: "insensitive" as const };
    const statuses = Object.entries(VISA_STATUS_LABELS)
      .filter(([k, label]) => label.toLowerCase().includes(q.toLowerCase()) || k.toLowerCase().includes(q.toLowerCase().replace(/\s+/g, "_")))
      .map(([k]) => k);
    const day = parseDayRange(q.trim());
    where.OR = [
      { publicId: ci },
      { university: ci },
      { program: ci },
      { consulate: ci },
      { intake: ci },
      ...(statuses.length ? [{ visaStatus: { in: statuses as any } }] : []),
      ...(day ? DATE_FIELDS.map((f) => ({ [f]: day })) : []),
      ...(session ? [{ name: ci }, { city: ci }] : []),
    ];
  }

  const orderBy: any[] = SORTABLE.has(sortParam)
    ? [{ [sortParam]: dir }, { createdAt: "asc" }]
    : [{ waitingListDate: "asc" }, { createdAt: "asc" }];

  const [total, applicants] = await Promise.all([
    prisma.applicant.count({ where }),
    prisma.applicant.findMany({
    where,
    orderBy,
    ...(page ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
    select: {
      id: true,
      publicId: true,
      name: true,
      university: true,
      program: true,
      intake: true,
      consulate: true,
      waitingListDate: true,
      submissionInviteDate: true,
      documentSubmissionDate: true,
      correctionRequestDate: true,
      correctionSubmittedDate: true,
      appointmentDate: true,
      interviewDate: true,
      decisionDate: true,
      visaStatus: true,
      approval: true,
      isAnonymous: true,
      createdAt: true,
      ...(session ? { deletedAt: true } : {}),
    },
    }),
  ]);

  // Applicants who chose to stay anonymous keep their name hidden on the public view.
  const display = applicants.map((a) => ({
    ...a,
    name: !session && a.isAnonymous ? null : a.name,
  }));

  return NextResponse.json({
    applicants: display,
    count: total,
    page: page || 1,
    pageSize: page ? pageSize : total,
    pageCount: page ? Math.max(1, Math.ceil(total / pageSize)) : 1,
  });
}

// POST /api/applicants — student self-submission (goes to PENDING_REVIEW)
// Returns the new public tracking ID + a private access code (shown once)
// so the applicant can log in later to manage their own entry.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const parsed = submitApplicantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const accessCode = generateAccessCode();
  const accessCodeHash = await bcrypt.hash(accessCode, 10);

  const applicant = await createApplicantWithTrackingId({
    accessCodeHash,
    name: data.name,
    email: data.email || null,
    gender: (data.gender as any) || null,
    city: data.city || null,
    province: data.province || null,
    university: data.university || null,
    program: data.program || null,
    intake: data.intake || null,
    visaType: data.visaType || null,
    consulate: data.consulate,
    waitingListCategory: data.waitingListCategory || null,
    sourceOfInformation: data.sourceOfInformation || null,
    additionalDocuments: data.additionalDocuments || null,
    waitingListDate: data.waitingListDate ? new Date(data.waitingListDate) : null,
    submissionInviteDate: data.submissionInviteDate ? new Date(data.submissionInviteDate) : null,
    documentSubmissionDate: data.documentSubmissionDate ? new Date(data.documentSubmissionDate) : null,
    appointmentDate: data.appointmentDate ? new Date(data.appointmentDate) : null,
    interviewDate: data.interviewDate ? new Date(data.interviewDate) : null,
    decisionDate: data.decisionDate ? new Date(data.decisionDate) : null,
    isAnonymous: data.isAnonymous ?? false,
    approval: "PENDING_REVIEW",
    visaStatus: "WAITING_LIST",
    history: {
      create: [{ visaStatus: "WAITING_LIST", note: "Entry submitted by applicant" }],
    },
  });

  return NextResponse.json(
    {
      applicant: (({ accessCodeHash: _hash, ...safe }) => safe)(applicant),
      publicId: applicant.publicId,
      accessCode,
      message:
        "Save your Tracking ID and Access Code — you'll need both to log in and manage this entry later. They will not be shown again.",
    },
    { status: 201 }
  );
}
