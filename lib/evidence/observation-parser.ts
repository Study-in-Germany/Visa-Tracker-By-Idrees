import { createHash } from "node:crypto";

export type EmbassyName = "Islamabad" | "Karachi";

export interface RawCommunityMessage {
  publishedAt: Date;
  text: string;
}

export interface ParsedTimelineRecord {
  embassy: EmbassyName;
  visaCategory: "Study";
  waitingListJoinedDate: Date | null;
  submissionInvitedDate: Date | null;
  documentsSubmittedDate: Date | null;
  preliminaryReviewDate: Date | null;
  correctionRequestDates: string[];
  correctionResponseDates: string[];
  correctionAcceptedDate: Date | null;
  appointmentInvitedDate: Date | null;
  appointmentBookedDate: Date | null;
  appointmentAttendedDate: Date | null;
  decisionDate: Date | null;
  decisionOutcome: "APPROVED" | "REJECTED" | "WITHDRAWN" | null;
  passportDispatchedDate: Date | null;
  passportReceivedDate: Date | null;
  reportPublishedAt: Date;
  datePrecision: "EXACT" | "INFERRED_YEAR" | "MONTH_ONLY" | "APPROXIMATE";
  confidence: number;
  dedupeFingerprint: string;
  rawExcerpt: string;
}

export interface ParsedQueueRecord {
  embassy: EmbassyName;
  visaCategory: "Study";
  observationDate: Date;
  queueType: "SUBMISSION_FRONTIER" | "APPOINTMENT_SUBMISSION_FRONTIER" | "APPOINTMENT_WL_COHORT_FRONTIER";
  observedFrontierDate: Date;
  sampleSize: number | null;
  reportedSubmissions: number | null;
  reportedCorrections: number | null;
  reportedAppointments: number | null;
  reportedActivityCount: number | null;
  confidence: number;
  dedupeFingerprint: string;
  notes: string;
}

export interface ParseBatchResult {
  timelines: ParsedTimelineRecord[];
  queueObservations: ParsedQueueRecord[];
  excludedCount: number;
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10, mov: 10,
  dec: 11, december: 11,
};

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function toUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isoDay(date: Date | null | undefined): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

/** Strips phones, IBANs, emails, URLs, and forwarded noise before persistence. */
export function scrubPrivacy(raw: string): string {
  return raw
    .replace(/\[Forwarded\]/gi, " ")
    .replace(/<image omitted>|<video omitted>|<media omitted>|This message was deleted/gi, " ")
    .replace(/\bPK\d{2}[A-Z0-9]{10,26}\b/gi, "[redacted]")
    .replace(/\+?\d[\d\s\-()]{7,}\d/g, "[phone]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/https?:\/\/\S+|www\.\S+/gi, "[link]")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function detectVisaExclusion(text: string): boolean {
  return /\b(frv|family\s+reunion|schengen|tourist|visit\s+visa|job\s+seeker|chancenkarte|opportunity\s+card|employment\s+visa|work\s+visa|business\s+visa|student\s*\+\s*frv)\b/i.test(
    text
  );
}

export function detectEmbassy(text: string): EmbassyName | null {
  const hasIsl = /\b(islamabad|isl|isb)\b/i.test(text);
  const hasKhi = /\b(karachi|khi|karachi\s+consulate|karachi\s+counslate)\b/i.test(text);
  if (hasIsl && !hasKhi) return "Islamabad";
  if (hasKhi && !hasIsl) return "Karachi";
  if (hasIsl && hasKhi) {
    return /islamabad\s+embassy|german\s+embassy\s+islamabad/i.test(text) ? "Islamabad" : null;
  }
  return null;
}

function makeValidUtcDate(year: number, monthIdx: number, day: number): Date | null {
  if (year < 2018 || year > 2030 || monthIdx < 0 || monthIdx > 11 || day < 1 || day > 31) return null;
  const dt = new Date(Date.UTC(year, monthIdx, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== monthIdx || dt.getUTCDate() !== day) return null;
  return dt;
}

function inferYearForMonthDay(monthIdx: number, day: number, publishedAt: Date): { date: Date; inferredYear: boolean } | null {
  const pubDay = toUtcDay(publishedAt);
  let year = pubDay.getUTCFullYear();
  let candidate = makeValidUtcDate(year, monthIdx, day);
  if (!candidate) return null;
  // If candidate falls more than 10 days after publication date, it refers to the prior calendar year
  if (candidate.getTime() - pubDay.getTime() > 10 * 86_400_000) {
    year -= 1;
    candidate = makeValidUtcDate(year, monthIdx, day);
  }
  return candidate ? { date: candidate, inferredYear: true } : null;
}

/**
 * Parses flexible date formats ("10 March 2026", "10 Mar", "10/03/2026",
 * "22st May 2026", "3rd Sept", "March 10", "Today", "Yesterday") relative to publication date.
 */
export function parseFlexibleDate(
  fragment: string,
  publishedAt: Date
): { date: Date; inferredYear: boolean } | null {
  const clean = fragment
    .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, " ")
    .replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, "$1")
    .replace(/[.,;]+$/, "")
    .trim();

  if (!clean) return null;

  if (/\btoday\b/i.test(clean)) {
    return { date: toUtcDay(publishedAt), inferredYear: true };
  }
  if (/\byesterday\b/i.test(clean)) {
    return { date: new Date(toUtcDay(publishedAt).getTime() - 86_400_000), inferredYear: true };
  }

  // ISO YYYY-MM-DD
  const isoMatch = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/.exec(clean);
  if (isoMatch) {
    const dt = makeValidUtcDate(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
    return dt ? { date: dt, inferredYear: false } : null;
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyNum = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/.exec(clean);
  if (dmyNum) {
    let year = +dmyNum[3];
    if (year < 100) year += 2000;
    const day = +dmyNum[1];
    const monthIdx = +dmyNum[2] - 1;
    const dt = makeValidUtcDate(year, monthIdx, day);
    return dt ? { date: dt, inferredYear: false } : null;
  }

  // DD Month (YYYY) or DD-Month-YYYY
  const dmyText = /\b(\d{1,2})[\s-]+([a-z]{3,9})(?:[\s,-]+(20\d{2}))?\b/i.exec(clean);
  if (dmyText) {
    const monthIdx = MONTHS[dmyText[2].toLowerCase()];
    if (monthIdx !== undefined) {
      const day = +dmyText[1];
      if (dmyText[3]) {
        const dt = makeValidUtcDate(+dmyText[3], monthIdx, day);
        return dt ? { date: dt, inferredYear: false } : null;
      }
      return inferYearForMonthDay(monthIdx, day, publishedAt);
    }
  }

  // Month DD(, YYYY)
  const mdyText = /\b([a-z]{3,9})\s+(\d{1,2})(?:[\s,]+(20\d{2}))?\b/i.exec(clean);
  if (mdyText) {
    const monthIdx = MONTHS[mdyText[1].toLowerCase()];
    if (monthIdx !== undefined) {
      const day = +mdyText[2];
      if (mdyText[3]) {
        const dt = makeValidUtcDate(+mdyText[3], monthIdx, day);
        return dt ? { date: dt, inferredYear: false } : null;
      }
      return inferYearForMonthDay(monthIdx, day, publishedAt);
    }
  }

  return null;
}

export function computeTimelineFingerprint(r: {
  embassy: EmbassyName;
  waitingListJoinedDate: Date | null;
  submissionInvitedDate: Date | null;
  documentsSubmittedDate: Date | null;
  appointmentInvitedDate: Date | null;
  appointmentAttendedDate: Date | null;
  decisionDate: Date | null;
  correctionRequestDates: string[];
}): string {
  const parts = [
    r.embassy,
    "Study",
    isoDay(r.waitingListJoinedDate) ?? "",
    isoDay(r.submissionInvitedDate) ?? "",
    isoDay(r.documentsSubmittedDate) ?? "",
    isoDay(r.appointmentInvitedDate) ?? "",
    isoDay(r.appointmentAttendedDate) ?? "",
    isoDay(r.decisionDate) ?? "",
    r.correctionRequestDates.join(","),
  ];
  return sha256(`timeline:${parts.join("|")}`);
}

export function computeQueueFingerprint(
  embassy: EmbassyName,
  queueType: ParsedQueueRecord["queueType"],
  observationDate: Date,
  frontierDate: Date
): string {
  return sha256(`queue:${embassy}|Study|${queueType}|${isoDay(observationDate)}|${isoDay(frontierDate)}`);
}

function parseDailySummary(text: string, publishedAt: Date): ParsedQueueRecord[] {
  const results: ParsedQueueRecord[] = [];
  const embassy = detectEmbassy(text);
  if (!embassy) return results;

  // Header date like "Today Update (25-November-2026)" or fallback to publication day
  const updateDateMatch = /Today\s+Update\s*\(([^)]+)\)/i.exec(text);
  const obsParsed = updateDateMatch ? parseFlexibleDate(updateDateMatch[1], publishedAt) : null;
  const observationDate = obsParsed?.date ?? toUtcDay(publishedAt);

  const subCountMatch = /\bSubmissions?\s*[-:]\s*(\d{1,4})\b/i.exec(text);
  const corrCountMatch = /\bCorrections?\s*[^\d\n]{0,6}[-:]\s*(\d{1,4})\b/i.exec(text);
  const apptCountMatch = /\bAppointments?\s*[^\d\n]{0,6}[-:]\s*(\d{1,4})\b/i.exec(text);
  const totalCountMatch = /\bTotal\s+Responses?\s*[-:]\s*(\d{1,4})\b/i.exec(text);

  const reportedSubmissions = subCountMatch ? +subCountMatch[1] : null;
  const reportedCorrections = corrCountMatch ? +corrCountMatch[1] : null;
  const reportedAppointments = apptCountMatch ? +apptCountMatch[1] : null;
  const reportedActivityCount =
    totalCountMatch ? +totalCountMatch[1] :
    (reportedSubmissions ?? 0) + (reportedCorrections ?? 0) + (reportedAppointments ?? 0) || null;

  const subReached = /submission\s+updates?\s+reached\s+([A-Za-z0-9\s,/-]+?)(?:\s*(?:,|while|\n|$))/i.exec(text);
  if (subReached) {
    const frontier = parseFlexibleDate(subReached[1], observationDate);
    if (frontier) {
      results.push({
        embassy,
        visaCategory: "Study",
        observationDate,
        queueType: "SUBMISSION_FRONTIER",
        observedFrontierDate: frontier.date,
        sampleSize: reportedSubmissions,
        reportedSubmissions,
        reportedCorrections,
        reportedAppointments,
        reportedActivityCount,
        confidence: 0.9,
        dedupeFingerprint: computeQueueFingerprint(embassy, "SUBMISSION_FRONTIER", observationDate, frontier.date),
        notes: "Daily community summary — submission update frontier",
      });
    }
  }

  const apptReached = /appointment\s+updates?\s+reached\s+([A-Za-z0-9\s,/-]+?)(?:\s*(?:\.|\n|$))/i.exec(text);
  if (apptReached) {
    const frontier = parseFlexibleDate(apptReached[1], observationDate);
    if (frontier) {
      results.push({
        embassy,
        visaCategory: "Study",
        observationDate,
        queueType: "APPOINTMENT_WL_COHORT_FRONTIER",
        observedFrontierDate: frontier.date,
        sampleSize: reportedAppointments,
        reportedSubmissions,
        reportedCorrections,
        reportedAppointments,
        reportedActivityCount,
        confidence: 0.85,
        dedupeFingerprint: computeQueueFingerprint(embassy, "APPOINTMENT_WL_COHORT_FRONTIER", observationDate, frontier.date),
        notes: "Daily community summary — waiting-list cohort reaching appointments",
      });
    }
  }

  return results;
}

function parseSingleTimelineBlock(
  blockText: string,
  publishedAt: Date,
  inheritedEmbassy: EmbassyName | null
): ParsedTimelineRecord | null {
  if (detectVisaExclusion(blockText)) return null;

  const clean = scrubPrivacy(blockText);
  if (!clean || clean.length < 18) return null;

  // Ignore conversational questions
  const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 3 && lines.some((l) => l.endsWith("?"))) return null;

  const embassy = detectEmbassy(clean) ?? inheritedEmbassy;
  if (!embassy) return null;

  let waitingListJoinedDate: Date | null = null;
  let submissionInvitedDate: Date | null = null;
  let documentsSubmittedDate: Date | null = null;
  let preliminaryReviewDate: Date | null = null;
  const correctionRequestDates: string[] = [];
  const correctionResponseDates: string[] = [];
  let correctionAcceptedDate: Date | null = null;
  let appointmentInvitedDate: Date | null = null;
  let appointmentBookedDate: Date | null = null;
  let appointmentAttendedDate: Date | null = null;
  let decisionDate: Date | null = null;
  let decisionOutcome: ParsedTimelineRecord["decisionOutcome"] = null;
  let passportDispatchedDate: Date | null = null;
  let passportReceivedDate: Date | null = null;
  let inferredAny = false;

  const extractDate = (str: string): Date | null => {
    const parsed = parseFlexibleDate(str, publishedAt);
    if (!parsed) return null;
    if (parsed.inferredYear) inferredAny = true;
    return parsed.date;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, " ").trim();

    // Format: "27 Jan 2026: Waiting List Joined" (leading date)
    const leadingDateMatch = /^(\d{1,2}(?:st|nd|rd|th)?\s+[a-z]{3,9}(?:\s+20\d{2})?)\s*[:-]\s*(.+)$/i.exec(line);
    const labelFirst = leadingDateMatch ? leadingDateMatch[2] : line;
    const valuePart = leadingDateMatch ? leadingDateMatch[1] : (line.split(/[:-]/, 2)[1] ?? "");

    if (/waiting\s*list|joined(?:\s+the)?\s+waiting|^joining\b/i.test(labelFirst)) {
      const dt = extractDate(valuePart || line);
      if (dt && !waitingListJoinedDate) waitingListJoinedDate = dt;
      continue;
    }

    if (/submission\s*(?:received|invite|link|option)|got\s+submission|application\s+submitted|documents?\s+submitted/i.test(labelFirst)) {
      const dt = extractDate(valuePart || line);
      if (/submission\s+received\s*&\s*documents\s+submitted/i.test(labelFirst)) {
        const useDt = dt ?? toUtcDay(publishedAt);
        if (!submissionInvitedDate) submissionInvitedDate = useDt;
        if (!documentsSubmittedDate) documentsSubmittedDate = useDt;
        continue;
      }
      if (/got\s+submission|submission\s+invite|submission\s+option|submission\s+link/i.test(labelFirst)) {
        submissionInvitedDate = dt ?? toUtcDay(publishedAt);
        if (!dt) inferredAny = true;
        continue;
      }
      if (/documents?\s+submitted|application\s+submitted/i.test(labelFirst)) {
        if (dt) documentsSubmittedDate = dt;
        continue;
      }
      if (/^submission\b/i.test(labelFirst)) {
        // Community shorthand "Submission: 13 Aug" marks actual submission if submission invite/WL happened earlier
        if (dt) {
          if (!submissionInvitedDate && !documentsSubmittedDate) {
            submissionInvitedDate = dt;
            documentsSubmittedDate = dt;
          } else {
            documentsSubmittedDate = dt;
          }
        }
        continue;
      }
    }

    if (/preliminary\s+review/i.test(labelFirst)) {
      const dt = extractDate(valuePart || line);
      if (dt) preliminaryReviewDate = dt;
      continue;
    }

    if (/(?:\d+(?:st|nd|rd|th)?\s+)?correction|got\s+correction|reply\s*:|\back\s*:/i.test(labelFirst)) {
      // Handle "Reply: 28 July | Ack: 30 July"
      if (/\breply\b/i.test(line)) {
        const replyMatch = /reply\s*[:-]\s*([^|]+)/i.exec(line);
        const dt = replyMatch ? extractDate(replyMatch[1]) : extractDate(valuePart || line);
        const iso = isoDay(dt);
        if (iso && !correctionResponseDates.includes(iso)) correctionResponseDates.push(iso);
      }
      if (/\back(?:nowledg(?:ed|ement))?\b/i.test(line)) {
        const ackMatch = /\back[a-z]*\s*[:-]\s*(.+)$/i.exec(line);
        const dt = ackMatch ? extractDate(ackMatch[1]) : null;
        if (dt) correctionAcceptedDate = dt;
      }
      if (/correction/i.test(labelFirst) && !/accepted/i.test(labelFirst)) {
        const dt = extractDate(valuePart || line) ?? toUtcDay(publishedAt);
        const iso = isoDay(dt);
        if (iso && !correctionRequestDates.includes(iso)) correctionRequestDates.push(iso);
      }
      continue;
    }

    if (/appointment\s+booked/i.test(labelFirst)) {
      const dt = extractDate(valuePart || line);
      if (dt) appointmentBookedDate = dt;
      continue;
    }

    if (/interview\s+appointment|interview\s*[:-]|biometric/i.test(labelFirst)) {
      const dt = extractDate(valuePart || line);
      if (dt) {
        appointmentAttendedDate = dt;
        if (!appointmentInvitedDate) appointmentInvitedDate = dt;
      }
      continue;
    }

    if (/appointment\s+(?:option\s+)?received|got\s+appointment|appointment\s+link|appointment\s+invite|appointment\s+option/i.test(labelFirst)) {
      if (/received\s*&\s*booked/i.test(labelFirst)) {
        const dt = extractDate(valuePart || line) ?? toUtcDay(publishedAt);
        appointmentInvitedDate = dt;
        appointmentBookedDate = dt;
        continue;
      }
      const dt = extractDate(valuePart || line) ?? toUtcDay(publishedAt);
      if (!dt) inferredAny = true;
      appointmentInvitedDate = dt;
      continue;
    }

    if (/decision\s+made/i.test(labelFirst)) {
      const dt = extractDate(valuePart || line);
      if (dt) decisionDate = dt;
      continue;
    }

    if (/passport\s+dispatched/i.test(labelFirst)) {
      const dt = extractDate(valuePart || line);
      if (dt) passportDispatchedDate = dt;
      continue;
    }

    if (/passport\s+received|visa\s+received|received\s+passport|\bvisa\s*[:-]\s*\d/i.test(labelFirst)) {
      const dt = extractDate(valuePart || line);
      if (dt) {
        passportReceivedDate = dt;
        decisionOutcome = "APPROVED";
      }
      continue;
    }

    // Ultra-short line pattern: "Name - 19 Jan" followed elsewhere by "Got Submission"
    if (!waitingListJoinedDate && /got\s+submission|got\s+appointment/i.test(clean)) {
      const nameDate = /^[^\d\n]{2,45}\s*[-–]\s*(\d{1,2}(?:st|nd|rd|th)?\s+[a-z]{3,9}(?:\s+20\d{2})?)$/i.exec(line);
      if (nameDate) {
        const dt = extractDate(nameDate[1]);
        if (dt) waitingListJoinedDate = dt;
      }
    }
  }

  if (/visa\s+(?:approved|granted|stamped|issued)/i.test(clean)) {
    decisionOutcome = "APPROVED";
  } else if (/visa\s+(?:rejected|refused)/i.test(clean)) {
    decisionOutcome = "REJECTED";
  } else if (/withdrawn/i.test(clean)) {
    decisionOutcome = "WITHDRAWN";
  }

  const stageCount = [
    waitingListJoinedDate,
    submissionInvitedDate,
    documentsSubmittedDate,
    appointmentInvitedDate,
    appointmentAttendedDate,
    decisionDate,
    passportReceivedDate,
  ].filter(Boolean).length;

  // Require at least 2 distinct dates/stages so stray chatter never creates fake records
  if (stageCount < 2) return null;

  // Multi-year repair: if waitingListJoinedDate appears chronologically AFTER submission/appointment only because
  // an inferred year defaulted to publishedYear, shift waitingListJoinedDate back 1 year when plausible.
  if (waitingListJoinedDate && submissionInvitedDate && waitingListJoinedDate.getTime() > submissionInvitedDate.getTime()) {
    const shifted = new Date(
      Date.UTC(
        waitingListJoinedDate.getUTCFullYear() - 1,
        waitingListJoinedDate.getUTCMonth(),
        waitingListJoinedDate.getUTCDate()
      )
    );
    if (submissionInvitedDate.getTime() - shifted.getTime() <= 550 * 86_400_000) {
      waitingListJoinedDate = shifted;
      inferredAny = true;
    }
  }

  // Strip the likely applicant name line (line 2 in "ISL Embassy / Name / ...") for privacy
  const scrubbedExcerpt = lines
    .filter((l, idx) => !(idx === 1 && /^[A-Za-z\s.]{2,35}$/.test(l) && !/anonymous|waiting|submission|appointment|visa/i.test(l)))
    .join(" | ")
    .slice(0, 280);

  const dedupeFingerprint = computeTimelineFingerprint({
    embassy,
    waitingListJoinedDate,
    submissionInvitedDate,
    documentsSubmittedDate,
    appointmentInvitedDate,
    appointmentAttendedDate,
    decisionDate,
    correctionRequestDates,
  });

  return {
    embassy,
    visaCategory: "Study",
    waitingListJoinedDate,
    submissionInvitedDate,
    documentsSubmittedDate,
    preliminaryReviewDate,
    correctionRequestDates,
    correctionResponseDates,
    correctionAcceptedDate,
    appointmentInvitedDate,
    appointmentBookedDate,
    appointmentAttendedDate,
    decisionDate,
    decisionOutcome,
    passportDispatchedDate,
    passportReceivedDate,
    reportPublishedAt: publishedAt,
    datePrecision: inferredAny ? "INFERRED_YEAR" : "EXACT",
    confidence: inferredAny ? 0.72 : 0.88,
    dedupeFingerprint,
    rawExcerpt: scrubbedExcerpt,
  };
}

/**
 * Extracts normalized timeline observations and queue frontier snapshots from raw messages.
 * Skips non-student categories, noise, bank/ad spam, and splits multi-block daily recaps cleanly.
 */
export function parseCommunityMessages(messages: RawCommunityMessage[]): ParseBatchResult {
  const timelines: ParsedTimelineRecord[] = [];
  const queueObservations: ParsedQueueRecord[] = [];
  let excludedCount = 0;

  for (const msg of messages) {
    const text = decodeHtmlEntities(msg.text || "").trim();
    if (!text) continue;

    if (detectVisaExclusion(text)) {
      excludedCount++;
      continue;
    }

    // 1. Check daily embassy frontier update format ("Today Update ...")
    if (/Today\s+Update|submission\s+updates?\s+reached/i.test(text)) {
      const qObs = parseDailySummary(text, msg.publishedAt);
      if (qObs.length > 0) {
        queueObservations.push(...qObs);
        continue;
      }
    }

    // 2. Multi-entry daily digest ("German Consulate General Karachi\nAppointments\nAnonymous\n...")
    const digestEmbassy = detectEmbassy(text);
    const hasAnonymousBlocks = /\bAnonymous\b/i.test(text) && (text.match(/Waiting\s+List:/gi)?.length ?? 0) >= 2;
    if (hasAnonymousBlocks && digestEmbassy) {
      const digestDateMatch = /(\d{1,2}\s+[A-Za-z]+\s+20\d{2})/.exec(text);
      const digestDate = digestDateMatch ? (parseFlexibleDate(digestDateMatch[1], msg.publishedAt)?.date ?? msg.publishedAt) : msg.publishedAt;
      const blocks = text.split(/(?=\bAnonymous\b)/i);
      for (const blk of blocks) {
        if (!/Waiting\s+List:/i.test(blk)) continue;
        const parsed = parseSingleTimelineBlock(blk, digestDate, digestEmbassy);
        if (parsed) timelines.push(parsed);
      }
      continue;
    }

    // 3. Individual timeline or short status report
    const single = parseSingleTimelineBlock(text, msg.publishedAt, null);
    if (single) {
      timelines.push(single);
    } else {
      excludedCount++;
    }
  }

  return { timelines, queueObservations, excludedCount };
}
