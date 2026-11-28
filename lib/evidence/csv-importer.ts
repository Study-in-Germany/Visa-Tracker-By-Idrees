import {
  computeQueueFingerprint,
  computeTimelineFingerprint,
  parseFlexibleDate,
  scrubPrivacy,
  toUtcDay,
  type EmbassyName,
  type ParseBatchResult,
  type ParsedQueueRecord,
  type ParsedTimelineRecord,
} from "./observation-parser";

function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cols.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

function normalizeEmbassy(v: string | undefined): EmbassyName | null {
  if (!v) return null;
  if (/islamabad|isl|isb/i.test(v)) return "Islamabad";
  if (/karachi|khi/i.test(v)) return "Karachi";
  return null;
}

function parseDateOpt(v: string | undefined, ref: Date): Date | null {
  if (!v?.trim()) return null;
  return parseFlexibleDate(v.trim(), ref)?.date ?? null;
}

/** Parses approved structured JSON observation payloads into timeline + queue observations. */
export function parseStructuredJsonEvidence(rawJson: unknown): ParseBatchResult {
  const timelines: ParsedTimelineRecord[] = [];
  const queueObservations: ParsedQueueRecord[] = [];
  let excludedCount = 0;

  const list = Array.isArray(rawJson)
    ? rawJson
    : Array.isArray((rawJson as any)?.observations)
      ? (rawJson as any).observations
      : [];

  const now = toUtcDay(new Date());

  for (const item of list) {
    if (!item || typeof item !== "object") {
      excludedCount++;
      continue;
    }
    const embassy = normalizeEmbassy(item.embassy || item.consulate);
    if (!embassy) {
      excludedCount++;
      continue;
    }

    if (item.queueType && item.observedFrontierDate && item.observationDate) {
      const obsDate = parseDateOpt(String(item.observationDate), now);
      const frontDate = parseDateOpt(String(item.observedFrontierDate), now);
      const qType = String(item.queueType) as ParsedQueueRecord["queueType"];
      if (!obsDate || !frontDate) {
        excludedCount++;
        continue;
      }
      queueObservations.push({
        embassy,
        visaCategory: "Study",
        observationDate: obsDate,
        queueType: qType,
        observedFrontierDate: frontDate,
        sampleSize: typeof item.sampleSize === "number" ? item.sampleSize : null,
        reportedSubmissions: typeof item.reportedSubmissions === "number" ? item.reportedSubmissions : null,
        reportedCorrections: typeof item.reportedCorrections === "number" ? item.reportedCorrections : null,
        reportedAppointments: typeof item.reportedAppointments === "number" ? item.reportedAppointments : null,
        reportedActivityCount: typeof item.reportedActivityCount === "number" ? item.reportedActivityCount : null,
        confidence: typeof item.confidence === "number" ? Math.min(1, Math.max(0.1, item.confidence)) : 0.85,
        dedupeFingerprint: computeQueueFingerprint(embassy, qType, obsDate, frontDate),
        notes: scrubPrivacy(String(item.notes || "Structured JSON queue observation")).slice(0, 200),
      });
      continue;
    }

    const reportPublishedAt = parseDateOpt(String(item.reportPublishedAt || ""), now) ?? now;
    const wl = parseDateOpt(item.waitingListJoinedDate, reportPublishedAt);
    const si = parseDateOpt(item.submissionInvitedDate, reportPublishedAt);
    const ds = parseDateOpt(item.documentsSubmittedDate, reportPublishedAt);
    const ai = parseDateOpt(item.appointmentInvitedDate, reportPublishedAt);
    const ab = parseDateOpt(item.appointmentBookedDate, reportPublishedAt);
    const at = parseDateOpt(item.appointmentAttendedDate, reportPublishedAt);
    const dc = parseDateOpt(item.decisionDate, reportPublishedAt);
    const pd = parseDateOpt(item.passportDispatchedDate, reportPublishedAt);
    const pr = parseDateOpt(item.passportReceivedDate, reportPublishedAt);

    if ([wl, si, ds, ai, ab, at, dc, pd, pr].filter(Boolean).length < 2) {
      excludedCount++;
      continue;
    }

    const correctionRequestDates = Array.isArray(item.correctionRequestDates) ? item.correctionRequestDates.map(String) : [];
    const correctionResponseDates = Array.isArray(item.correctionResponseDates) ? item.correctionResponseDates.map(String) : [];

    timelines.push({
      embassy,
      visaCategory: "Study",
      waitingListJoinedDate: wl,
      submissionInvitedDate: si,
      documentsSubmittedDate: ds,
      preliminaryReviewDate: parseDateOpt(item.preliminaryReviewDate, reportPublishedAt),
      correctionRequestDates,
      correctionResponseDates,
      correctionAcceptedDate: parseDateOpt(item.correctionAcceptedDate, reportPublishedAt),
      appointmentInvitedDate: ai,
      appointmentBookedDate: ab,
      appointmentAttendedDate: at,
      decisionDate: dc,
      decisionOutcome: item.decisionOutcome === "APPROVED" || item.decisionOutcome === "REJECTED" || item.decisionOutcome === "WITHDRAWN" ? item.decisionOutcome : null,
      passportDispatchedDate: pd,
      passportReceivedDate: pr,
      reportPublishedAt,
      datePrecision: "EXACT",
      confidence: typeof item.confidence === "number" ? Math.min(1, Math.max(0.1, item.confidence)) : 0.85,
      dedupeFingerprint: computeTimelineFingerprint({
        embassy,
        waitingListJoinedDate: wl,
        submissionInvitedDate: si,
        documentsSubmittedDate: ds,
        appointmentInvitedDate: ai,
        appointmentAttendedDate: at,
        decisionDate: dc,
        correctionRequestDates,
      }),
      rawExcerpt: scrubPrivacy(String(item.notes || "Structured JSON import")).slice(0, 280),
    });
  }

  return { timelines, queueObservations, excludedCount };
}

/** Parses structured CSV evidence rows into normalized timelines. */
export function parseCsvEvidence(csvText: string): ParseBatchResult {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { timelines: [], queueObservations: [], excludedCount: 0 };

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitCsvLine(lines[i]);
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rec[h] = vals[idx] ?? "";
    });
    rows.push(rec);
  }
  return parseStructuredJsonEvidence(rows);
}
