import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/authorization";
import { privateJson } from "@/lib/security/cache-policy";
import { parseCsvEvidence, parseStructuredJsonEvidence } from "@/lib/evidence/csv-importer";
import { parseHtmlChannelExport } from "@/lib/evidence/html-importer";
import { parseWhatsAppTextExport, parseWhatsAppZipExport } from "@/lib/evidence/whatsapp-importer";
import { ingestParsedEvidence } from "@/lib/evidence/evidence-service";
import { computeQueueFingerprint } from "@/lib/evidence/observation-parser";
import { invalidateForecastCache } from "@/lib/forecasting/forecast-service";
import { parseCalendarDay } from "@/lib/period";

export const dynamic = "force-dynamic";

const manualQueueSchema = z.object({
  mode: z.literal("manual_queue"),
  embassy: z.enum(["Islamabad", "Karachi"]),
  queueType: z.enum(["SUBMISSION_FRONTIER", "APPOINTMENT_SUBMISSION_FRONTIER", "APPOINTMENT_WL_COHORT_FRONTIER"]),
  observationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observedFrontierDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reportedSubmissions: z.number().int().min(0).max(5000).optional(),
  reportedCorrections: z.number().int().min(0).max(5000).optional(),
  reportedAppointments: z.number().int().min(0).max(5000).optional(),
  notes: z.string().max(500).optional(),
});

const importTextSchema = z.object({
  mode: z.enum(["text", "html", "csv", "json"]),
  sourceName: z.string().trim().min(2).max(120),
  content: z.string().min(5).max(5_000_000),
  approveValid: z.boolean().optional(),
});

// GET /api/admin/evidence — inspect sources, timeline observations, queue observations, and forecast snapshots
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const embassy = searchParams.get("embassy") || undefined;

  const [sources, timelines, queueObservations, snapshots] = await Promise.all([
    prisma.evidenceSource.findMany({
      orderBy: { lastUpdatedAt: "desc" },
      include: {
        _count: { select: { timelines: true, queueObservations: true } },
      },
    }),
    prisma.externalTimelineObservation.findMany({
      where: {
        ...(status ? { verificationStatus: status as any } : {}),
        ...(embassy ? { embassy } : {}),
      },
      orderBy: [{ verificationStatus: "asc" }, { reportPublishedAt: "desc" }],
      take: 80,
      include: { source: { select: { name: true, reliability: true } } },
    }),
    prisma.queueObservation.findMany({
      where: {
        ...(status ? { verificationStatus: status as any } : {}),
        ...(embassy ? { embassy } : {}),
      },
      orderBy: { observationDate: "desc" },
      take: 80,
      include: { source: { select: { name: true, sourceType: true } } },
    }),
    prisma.forecastSnapshot.findMany({
      orderBy: { generatedAt: "desc" },
      take: 25,
    }),
  ]);

  return privateJson({ sources, timelines, queueObservations, snapshots });
}

// POST /api/admin/evidence — record manual verified observation or import reviewed community dataset
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData().catch(() => null);
    const file = formData?.get("file");
    const sourceName = String(formData?.get("sourceName") || "Admin uploaded dataset").trim();
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Upload a valid file." }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const lower = file.name.toLowerCase();
    let batch;
    let sourceType: "WHATSAPP_EXPORT" | "CHANNEL_EXPORT" | "CSV_IMPORT" | "JSON_IMPORT" = "WHATSAPP_EXPORT";

    if (lower.endsWith(".zip")) {
      batch = parseWhatsAppZipExport(buf);
      sourceType = "WHATSAPP_EXPORT";
    } else if (lower.endsWith(".html") || lower.endsWith(".htm")) {
      batch = parseHtmlChannelExport(buf.toString("utf8"));
      sourceType = "CHANNEL_EXPORT";
    } else if (lower.endsWith(".csv")) {
      batch = parseCsvEvidence(buf.toString("utf8"));
      sourceType = "CSV_IMPORT";
    } else if (lower.endsWith(".json")) {
      batch = parseStructuredJsonEvidence(JSON.parse(buf.toString("utf8")));
      sourceType = "JSON_IMPORT";
    } else {
      batch = parseWhatsAppTextExport(buf.toString("utf8"));
      sourceType = "WHATSAPP_EXPORT";
    }

    const summary = await ingestParsedEvidence(
      {
        name: sourceName,
        sourceType,
        sourceRef: `admin-upload:${file.name}:${Date.now()}`,
        reliability: "VERIFIED_COMMUNITY",
        usagePermission: "ADMIN_REVIEWED_UPLOAD",
        verificationStatus: "APPROVED",
      },
      batch
    );
    invalidateForecastCache();
    return NextResponse.json({ summary }, { status: 201 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  if (body.mode === "manual_queue") {
    const parsed = manualQueueSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const d = parsed.data;
    const obsDate = parseCalendarDay(d.observationDate)!;
    const frontDate = parseCalendarDay(d.observedFrontierDate)!;

    const src = await prisma.evidenceSource.upsert({
      where: { sourceRef: "manual-admin:verified-queue" },
      create: {
        name: "Manual Admin Verified Queue Observations",
        sourceType: "MANUAL_ADMIN",
        sourceRef: "manual-admin:verified-queue",
        reliability: "VERIFIED_COMMUNITY",
        usagePermission: "ADMIN_VERIFIED",
        verificationStatus: "APPROVED",
      },
      update: { lastUpdatedAt: new Date() },
    });

    const fp = computeQueueFingerprint(d.embassy, d.queueType, obsDate, frontDate);
    const created = await prisma.queueObservation.upsert({
      where: { dedupeFingerprint: fp },
      create: {
        sourceId: src.id,
        embassy: d.embassy,
        observationDate: obsDate,
        queueType: d.queueType,
        observedFrontierDate: frontDate,
        reportedSubmissions: d.reportedSubmissions ?? null,
        reportedCorrections: d.reportedCorrections ?? null,
        reportedAppointments: d.reportedAppointments ?? null,
        confidence: 0.95,
        verificationStatus: "APPROVED",
        dedupeFingerprint: fp,
        notes: d.notes || `Manually verified by admin (${session.email})`,
      },
      update: {
        reportedSubmissions: d.reportedSubmissions ?? undefined,
        reportedCorrections: d.reportedCorrections ?? undefined,
        reportedAppointments: d.reportedAppointments ?? undefined,
        verificationStatus: "APPROVED",
        notes: d.notes || `Updated by admin (${session.email})`,
      },
    });
    invalidateForecastCache();
    return NextResponse.json({ observation: created }, { status: 201 });
  }

  const parsedText = importTextSchema.safeParse(body);
  if (!parsedText.success) return NextResponse.json({ error: parsedText.error.flatten() }, { status: 400 });
  const t = parsedText.data;
  const batch =
    t.mode === "html"
      ? parseHtmlChannelExport(t.content)
      : t.mode === "csv"
        ? parseCsvEvidence(t.content)
        : t.mode === "json"
          ? parseStructuredJsonEvidence(JSON.parse(t.content))
          : parseWhatsAppTextExport(t.content);

  const summary = await ingestParsedEvidence(
    {
      name: t.sourceName,
      sourceType: t.mode === "html" ? "CHANNEL_EXPORT" : t.mode === "csv" ? "CSV_IMPORT" : t.mode === "json" ? "JSON_IMPORT" : "WHATSAPP_EXPORT",
      sourceRef: `admin-paste:${t.mode}:${Date.now()}`,
      reliability: "VERIFIED_COMMUNITY",
      usagePermission: "ADMIN_REVIEWED_UPLOAD",
      verificationStatus: "APPROVED",
    },
    batch,
    { approveAllValid: Boolean(t.approveValid) }
  );
  invalidateForecastCache();
  return NextResponse.json({ summary }, { status: 201 });
}
