"use client";

import { useEffect } from "react";
import AnalyticsWorkspace from "@/components/analytics/layout/AnalyticsWorkspace";
import type { AnalyticsDashboardPayload } from "@/lib/analytics/dashboard-types";

function stat(med: number | null, n: number, p25: number | null = med, p75: number | null = med, censoredCount = 0) {
  return {
    sampleSize: n,
    effectiveSampleSize: n,
    censoredCount,
    mean: med,
    median: med,
    weightedMedian: med,
    stdDev: null,
    min: p25,
    max: p75,
    p10: p25,
    p25,
    p50: med,
    p75,
    p90: p75,
    iqr: p25 !== null && p75 !== null ? p75 - p25 : null,
  };
}

function makeBaseFixture(overrides?: Partial<AnalyticsDashboardPayload>): AnalyticsDashboardPayload {
  const base: AnalyticsDashboardPayload = {
    asOfDate: "2026-11-28",
    generatedAt: "2026-11-28T06:00:00Z",
    filtersApplied: {
      from: "",
      to: "",
      consulate: "",
      visaStatus: "",
      university: "",
      intake: "",
      dateDimension: "waitingListDate",
    },
    facets: {
      universities: [
        { value: "tu-chemnitz", label: "TU Chemnitz", count: 13 },
        { value: "tu-ilmenau", label: "TU Ilmenau", count: 9 },
        { value: "arden-university", label: "Arden University", count: 9 },
        { value: "ruhr-university-bochum", label: "Ruhr University Bochum", count: 5 },
      ],
      intakes: [
        { value: "winter 2026", label: "Winter 2026", count: 164 },
        { value: "summer 2027", label: "Summer 2027", count: 121 },
      ],
    },
    summary: {
      total: 424,
      withWaitingListDate: 398,
      activeApplicants: 424,
      completedCases: 0,
      visaIssued: 0,
      visaRejected: 0,
      withdrawn: 0,
      decidedCases: 0,
      approvalRatePct: null,
      medianWaitDays: 256,
      waitP25Days: 245,
      waitP75Days: 263,
      waitSampleSize: 47,
      invitationsRecorded: 60,
      appointmentsRecorded: 28,
    },
    activity: {
      monthlyByJoinDate: [
        { period: "2026-01", total: 22, islamabad: 20, karachi: 2 },
        { period: "2026-02", total: 18, islamabad: 16, karachi: 2 },
        { period: "2026-03", total: 33, islamabad: 31, karachi: 2 },
        { period: "2026-04", total: 35, islamabad: 33, karachi: 2 },
        { period: "2026-05", total: 31, islamabad: 29, karachi: 2 },
        { period: "2026-06", total: 66, islamabad: 58, karachi: 8 },
        { period: "2026-07", total: 73, islamabad: 62, karachi: 11 },
        { period: "2026-08", total: 37, islamabad: 30, karachi: 7 },
        { period: "2026-09", total: 31, islamabad: 25, karachi: 6 },
        { period: "2026-10", total: 38, islamabad: 30, karachi: 8 },
        { period: "2026-11", total: 18, islamabad: 16, karachi: 2 },
      ],
      weeklyByJoinDate: [
        { period: "2026-10-19", total: 9, islamabad: 7, karachi: 2 },
        { period: "2026-10-26", total: 10, islamabad: 8, karachi: 2 },
        { period: "2026-11-02", total: 8, islamabad: 7, karachi: 1 },
        { period: "2026-11-09", total: 6, islamabad: 5, karachi: 1 },
        { period: "2026-11-16", total: 4, islamabad: 4, karachi: 0 },
      ],
      monthlyByEntryDate: [
        { period: "2026-09", total: 48, islamabad: 40, karachi: 8 },
        { period: "2026-10", total: 182, islamabad: 160, karachi: 22 },
        { period: "2026-11", total: 194, islamabad: 175, karachi: 19 },
      ],
      weeklyByEntryDate: [
        { period: "2026-11-02", total: 55, islamabad: 49, karachi: 6 },
        { period: "2026-11-09", total: 64, islamabad: 58, karachi: 6 },
        { period: "2026-11-16", total: 47, islamabad: 42, karachi: 5 },
      ],
    },
    embassyDistribution: [
      { consulate: "Islamabad", total: 375, active: 375, issued: 0, rejected: 0, sharePct: 88.4 },
      { consulate: "Karachi", total: 49, active: 49, issued: 0, rejected: 0, sharePct: 11.6 },
    ],
    statusDistribution: [
      { status: "WAITING_LIST", count: 364, sharePct: 85.8, isActive: true, isTerminal: false },
      { status: "WAITING_FOR_SUBMISSION", count: 7, sharePct: 1.7, isActive: true, isTerminal: false },
      { status: "SUBMISSION_RECEIVED", count: 16, sharePct: 3.8, isActive: true, isTerminal: false },
      { status: "UNDER_CORRECTION", count: 4, sharePct: 0.9, isActive: true, isTerminal: false },
      { status: "APPOINTMENT_SCHEDULED", count: 18, sharePct: 4.2, isActive: true, isTerminal: false },
      { status: "PROCESSING", count: 15, sharePct: 3.5, isActive: true, isTerminal: false },
    ],
    processingDurations: {
      stages: [
        {
          id: "wl_to_invite",
          label: "Waiting list → Submission invite",
          shortLabel: "Waiting list → Invite",
          definition: "Waiting-list registration date to submission invitation date.",
          sampleSize: 47,
          medianDays: 256,
          p25Days: 245,
          p75Days: 263,
          minDays: 110,
          maxDays: 270,
          available: true,
          note: null,
        },
        {
          id: "doc_to_appt",
          label: "Documents submitted → Appointment",
          shortLabel: "Docs → Appointment",
          definition: "Actual document submission date to appointment date.",
          sampleSize: 22,
          medianDays: 24,
          p25Days: 17,
          p75Days: 33,
          minDays: 7,
          maxDays: 65,
          available: true,
          note: null,
        },
        {
          id: "appt_to_decision",
          label: "Physical appointment → Visa decision",
          shortLabel: "Appointment → Decision",
          definition: "Appointment attendance to decision date.",
          sampleSize: 0,
          medianDays: null,
          p25Days: null,
          p75Days: null,
          minDays: null,
          maxDays: null,
          available: false,
          note: "No recorded visa decisions in internal tracker cohort",
        },
      ],
      observedEndToEnd: {
        sampleSize: 0,
        medianDays: null,
        p25Days: null,
        p75Days: null,
        available: false,
      },
    },
    internalDecisions: {
      issued: 0,
      rejected: 0,
      withdrawn: 0,
      decided: 0,
      approvalRatePct: null,
      monthlyOutcomes: [],
      medianDecisionDays: null,
      decisionDurationSampleSize: 0,
    },
    universities: {
      totalWithUniversity: 390,
      uniqueNormalizedCount: 18,
      items: [
        {
          key: "tu-chemnitz",
          displayName: "TU Chemnitz",
          count: 13,
          rawVariants: [
            { label: "TU Chemnitz", count: 7 },
            { label: "TU Chemnitz ", count: 6 },
          ],
        },
        {
          key: "tu-ilmenau",
          displayName: "TU Ilmenau",
          count: 9,
          rawVariants: [
            { label: "TU Ilmenau", count: 5 },
            { label: "TU Ilmenau ", count: 2 },
            { label: "TU ilmenau", count: 2 },
          ],
        },
        {
          key: "arden-university",
          displayName: "Arden University",
          count: 9,
          rawVariants: [
            { label: "Arden university ", count: 5 },
            { label: "Arden", count: 4 },
          ],
        },
        {
          key: "ruhr-university-bochum",
          displayName: "Ruhr University Bochum",
          count: 5,
          rawVariants: [
            { label: "Ruhr Universität Bochum ", count: 3 },
            { label: "Ruhr Bochum ", count: 2 },
          ],
        },
        {
          key: "university-of-rostock",
          displayName: "University of Rostock",
          count: 5,
          rawVariants: [
            { label: "University of Rostock ", count: 3 },
            { label: "Rostock Universität ", count: 2 },
          ],
        },
        {
          key: "university-of-bremen",
          displayName: "University of Bremen",
          count: 4,
          rawVariants: [{ label: "University of Bremen", count: 4 }],
        },
      ],
    },
    programmes: {
      totalWithProgramme: 334,
      items: [
        { key: "masters-unspecified", displayName: "Master's (unspecified)", count: 30, rawVariants: [{ label: "Master", count: 13 }, { label: "Masters", count: 17 }] },
        { key: "data-science", displayName: "Data Science", count: 6, rawVariants: [{ label: "Data Science", count: 6 }] },
        { key: "rcse", displayName: "RCSE", count: 5, rawVariants: [{ label: "RCSE", count: 5 }] },
        { key: "phd", displayName: "PhD / Doctorate", count: 5, rawVariants: [{ label: "phd", count: 5 }] },
      ],
    },
    intelligence: {
      modelVersion: "v2.0.0-mc-km-ensemble",
      datasetSummary: {
        internalApprovedCount: 423,
        externalTimelineCount: 273,
        combinedDeduplicatedCount: 680,
        queueObservationsCount: 72,
      },
      embassies: {
        Islamabad: {
          modelVersion: "v2.0.0-mc-km-ensemble",
          generatedAt: "2026-11-28T06:00:00Z",
          embassy: "Islamabad",
          frontiers: {
            submission: {
              embassy: "Islamabad",
              queueType: "SUBMISSION_FRONTIER",
              internalLatestCohort: "2026-02-23",
              internalSampleSize: 38,
              combinedFrontierDate: "2026-03-09",
              observedRangeStart: "2026-03-02",
              observedRangeEnd: "2026-03-10",
              sampleSize: 12,
              effectiveSampleSize: 9.7,
              lastUpdatedDate: "2026-11-26",
              hasConflict: true,
              conflictSummary: "Recent same-day reports vary across an 8-day cohort span.",
              sourceClassification: "Combined internal & community evidence",
              confidence: "low",
            },
            appointmentBySubmission: {
              embassy: "Islamabad",
              queueType: "APPOINTMENT_SUBMISSION_FRONTIER",
              internalLatestCohort: "2026-11-12",
              internalSampleSize: 18,
              combinedFrontierDate: "2026-11-24",
              observedRangeStart: "2026-10-23",
              observedRangeEnd: "2026-11-26",
              sampleSize: 10,
              effectiveSampleSize: 5.9,
              lastUpdatedDate: "2026-11-26",
              hasConflict: false,
              conflictSummary: null,
              sourceClassification: "Combined internal & community evidence",
              confidence: "low",
            },
            appointmentByWaitingList: {
              embassy: "Islamabad",
              queueType: "APPOINTMENT_WL_COHORT_FRONTIER",
              internalLatestCohort: "2026-02-19",
              internalSampleSize: 19,
              combinedFrontierDate: "2026-03-05",
              observedRangeStart: "2026-03-01",
              observedRangeEnd: "2026-03-06",
              sampleSize: 12,
              effectiveSampleSize: 11.3,
              lastUpdatedDate: "2026-11-27",
              hasConflict: false,
              conflictSummary: null,
              sourceClassification: "Combined internal & community evidence",
              confidence: "low",
            },
          },
          velocity: {
            weightedWeeklyDays: 7.3,
            rawLatestWeeklyDays: 9.2,
            windows: [
              { windowDays: 7, weeklyRateDays: 9.2, observationsCount: 5, spanDays: 5 },
              { windowDays: 30, weeklyRateDays: 6.1, observationsCount: 22, spanDays: 28 },
              { windowDays: 90, weeklyRateDays: 6.1, observationsCount: 45, spanDays: 86 },
            ],
            isStalled: false,
            weightsUsed: { 7: 0.3, 30: 0.4, 90: 0.3 },
          },
          durations: {
            embassy: "Islamabad",
            totalEligibleCount: 580,
            waitingToInvite: stat(259, 131, 257, 263, 300),
            waitingToInviteInternalOnly: stat(258, 39, 252, 262),
            submissionDelay: stat(1, 30, 0, 2),
            documentReview: stat(10.5, 24, 6, 36.5),
            appointmentScheduling: stat(5, 11, 3, 7),
            decisionProcessing: stat(5, 3, 4.5, 9),
            passportDelivery: stat(3, 2, 2, 4),
            totalJourney: stat(282, 5, 275, 290),
            corrections: {
              eligibleSubmissionsCount: 138,
              applicantsWithCorrection: 22,
              totalCorrectionEvents: 25,
              correctionRatePct: 15.9,
              timeUntilFirstCorrection: stat(7, 12, 5, 10),
              correctionResponseTime: stat(2, 10, 1, 3),
              postCorrectionProcessing: stat(0, 3, 0, 0),
            },
            decisions: {
              approvedCount: 4,
              rejectedCount: 0,
              withdrawnCount: 0,
              approvalRatePct: 100,
            },
            survivalMedianDays: 259,
            survivalP25Days: 257,
            survivalP75Days: 263,
          },
          progressionHistory: [],
          progressionPoints: [
            { observationDate: "2026-06-05", submissionFrontier: "2026-06-05", appointmentWlFrontier: null, reportedSubmissions: null, reportedCorrections: null, reportedAppointments: null, source: "individual_report" },
            { observationDate: "2026-08-14", submissionFrontier: "2026-01-08", appointmentWlFrontier: null, reportedSubmissions: null, reportedCorrections: null, reportedAppointments: null, source: "individual_report" },
            { observationDate: "2026-08-21", submissionFrontier: "2026-01-14", appointmentWlFrontier: null, reportedSubmissions: null, reportedCorrections: null, reportedAppointments: null, source: "individual_report" },
            { observationDate: "2026-10-09", submissionFrontier: "2026-01-25", appointmentWlFrontier: "2026-01-12", reportedSubmissions: 20, reportedCorrections: 16, reportedAppointments: 22, source: "queue_checkpoint" },
            { observationDate: "2026-10-13", submissionFrontier: "2026-04-28", appointmentWlFrontier: null, reportedSubmissions: null, reportedCorrections: null, reportedAppointments: null, source: "individual_report" },
            { observationDate: "2026-10-16", submissionFrontier: "2026-02-02", appointmentWlFrontier: "2026-01-18", reportedSubmissions: 19, reportedCorrections: 7, reportedAppointments: 10, source: "queue_checkpoint" },
            { observationDate: "2026-10-23", submissionFrontier: "2026-02-08", appointmentWlFrontier: "2026-01-28", reportedSubmissions: 20, reportedCorrections: 7, reportedAppointments: 16, source: "queue_checkpoint" },
            { observationDate: "2026-11-02", submissionFrontier: "2026-02-16", appointmentWlFrontier: "2026-02-10", reportedSubmissions: 5, reportedCorrections: 0, reportedAppointments: 4, source: "queue_checkpoint" },
            { observationDate: "2026-11-09", submissionFrontier: "2026-02-23", appointmentWlFrontier: "2026-02-14", reportedSubmissions: 10, reportedCorrections: 9, reportedAppointments: 8, source: "queue_checkpoint" },
            { observationDate: "2026-11-16", submissionFrontier: "2026-02-28", appointmentWlFrontier: "2026-02-19", reportedSubmissions: 13, reportedCorrections: 1, reportedAppointments: 9, source: "queue_checkpoint" },
            { observationDate: "2026-11-25", submissionFrontier: "2026-03-10", appointmentWlFrontier: "2026-03-05", reportedSubmissions: 27, reportedCorrections: 5, reportedAppointments: 18, source: "queue_checkpoint" },
            { observationDate: "2026-11-26", submissionFrontier: "2026-03-02", appointmentWlFrontier: "2026-03-06", reportedSubmissions: 16, reportedCorrections: 8, reportedAppointments: 7, source: "queue_checkpoint" },
          ],
          weeklyActivity: [
            { weekStart: "2026-10-12", submissions: 19, corrections: 8, appointments: 19, cohortDaysCleared: 138 },
            { weekStart: "2026-10-19", submissions: 12, corrections: 14, appointments: 20, cohortDaysCleared: 20 },
            { weekStart: "2026-10-26", submissions: 23, corrections: 19, appointments: 30, cohortDaysCleared: 162 },
            { weekStart: "2026-11-02", submissions: 7, corrections: 5, appointments: 16, cohortDaysCleared: 282 },
            { weekStart: "2026-11-09", submissions: 16, corrections: 11, appointments: 20, cohortDaysCleared: 271 },
            { weekStart: "2026-11-16", submissions: 9, corrections: 8, appointments: 20, cohortDaysCleared: 8 },
            { weekStart: "2026-11-23", submissions: 12, corrections: 10, appointments: 23, cohortDaysCleared: 11 },
            { weekStart: "2026-11-30", submissions: 1, corrections: 1, appointments: 1, cohortDaysCleared: null },
          ],
          cohortProgress: [
            { month: "2026-01", total: 20, waitingList: 0, submissionInvited: 2, documentsSubmitted: 8, appointmentStage: 10, visaIssued: 0, visaRejected: 0, withdrawn: 0 },
            { month: "2026-02", total: 16, waitingList: 11, submissionInvited: 0, documentsSubmitted: 1, appointmentStage: 4, visaIssued: 0, visaRejected: 0, withdrawn: 0 },
            { month: "2026-03", total: 31, waitingList: 30, submissionInvited: 0, documentsSubmitted: 0, appointmentStage: 1, visaIssued: 0, visaRejected: 0, withdrawn: 0 },
            { month: "2026-06", total: 58, waitingList: 53, submissionInvited: 1, documentsSubmitted: 2, appointmentStage: 2, visaIssued: 0, visaRejected: 0, withdrawn: 0 },
            { month: "2026-07", total: 62, waitingList: 61, submissionInvited: 0, documentsSubmitted: 1, appointmentStage: 0, visaIssued: 0, visaRejected: 0, withdrawn: 0 },
            { month: "2026-10", total: 30, waitingList: 30, submissionInvited: 0, documentsSubmitted: 0, appointmentStage: 0, visaIssued: 0, visaRejected: 0, withdrawn: 0 },
          ],
          waitByInviteMonth: [
            { month: "2026-06", medianDays: 0, p25Days: 0, p75Days: 0, sampleSize: 3 },
            { month: "2026-07", medianDays: 214, p25Days: 25, p75Days: 219, sampleSize: 4 },
            { month: "2026-08", medianDays: 219, p25Days: 218, p75Days: 219, sampleSize: 7 },
            { month: "2026-09", medianDays: 227, p25Days: 227, p75Days: 227, sampleSize: 1 },
            { month: "2026-10", medianDays: 259, p25Days: 257, p75Days: 260, sampleSize: 74 },
            { month: "2026-11", medianDays: 264, p25Days: 262, p75Days: 265, sampleSize: 41 },
            { month: "2026-12", medianDays: 7, p25Days: 7, p75Days: 7, sampleSize: 1 },
          ],
          decisionComparison: {
            internalApprovedCount: 0,
            internalRejectedCount: 0,
            internalWithdrawnCount: 0,
            internalDecidedCount: 0,
            externalApprovedCount: 4,
            externalRejectedCount: 0,
            externalWithdrawnCount: 0,
            externalDecidedCount: 4,
            externalApprovalRatePct: 100,
            externalDecisionMedianDays: 5,
            externalDecisionSampleSize: 3,
          },
        },
        Karachi: {
          modelVersion: "v2.0.0-mc-km-ensemble",
          generatedAt: "2026-11-28T06:00:00Z",
          embassy: "Karachi",
          frontiers: {
            submission: {
              embassy: "Karachi",
              queueType: "SUBMISSION_FRONTIER",
              internalLatestCohort: "2026-07-05",
              internalSampleSize: 8,
              combinedFrontierDate: "2026-07-09",
              observedRangeStart: "2026-07-03",
              observedRangeEnd: "2026-07-12",
              sampleSize: 4,
              effectiveSampleSize: 2.3,
              lastUpdatedDate: "2026-11-26",
              hasConflict: false,
              conflictSummary: null,
              sourceClassification: "Combined internal & community evidence",
              confidence: "insufficient",
            },
            appointmentBySubmission: {
              embassy: "Karachi",
              queueType: "APPOINTMENT_SUBMISSION_FRONTIER",
              internalLatestCohort: "2026-10-01",
              internalSampleSize: 4,
              combinedFrontierDate: "2026-10-18",
              observedRangeStart: "2026-09-10",
              observedRangeEnd: "2026-10-18",
              sampleSize: 12,
              effectiveSampleSize: 1.4,
              lastUpdatedDate: "2026-11-26",
              hasConflict: false,
              conflictSummary: null,
              sourceClassification: "Combined internal & community evidence",
              confidence: "insufficient",
            },
            appointmentByWaitingList: {
              embassy: "Karachi",
              queueType: "APPOINTMENT_WL_COHORT_FRONTIER",
              internalLatestCohort: "2026-06-08",
              internalSampleSize: 4,
              combinedFrontierDate: "2026-06-02",
              observedRangeStart: "2026-05-22",
              observedRangeEnd: "2026-06-08",
              sampleSize: 12,
              effectiveSampleSize: 9.2,
              lastUpdatedDate: "2026-10-19",
              hasConflict: false,
              conflictSummary: null,
              sourceClassification: "Combined internal & community evidence",
              confidence: "low",
            },
          },
          velocity: {
            weightedWeeklyDays: 4.0,
            rawLatestWeeklyDays: 3.9,
            windows: [
              { windowDays: 14, weeklyRateDays: 3.9, observationsCount: 2, spanDays: 9 },
              { windowDays: 30, weeklyRateDays: 3.7, observationsCount: 6, spanDays: 23 },
              { windowDays: 90, weeklyRateDays: 4.7, observationsCount: 13, spanDays: 84 },
            ],
            isStalled: false,
            weightsUsed: { 14: 0.4, 30: 0.4, 90: 0.2 },
          },
          durations: {
            embassy: "Karachi",
            totalEligibleCount: 100,
            waitingToInvite: stat(119, 15, 115, 126.5, 40),
            waitingToInviteInternalOnly: stat(117, 8, 113, 122),
            submissionDelay: stat(1, 12, 0, 2),
            documentReview: stat(22, 17, 21, 25),
            appointmentScheduling: stat(5, 5, 3, 7),
            decisionProcessing: stat(14, 1, 14, 14),
            passportDelivery: stat(null, 0, null, null),
            totalJourney: stat(164, 1, 164, 164),
            corrections: {
              eligibleSubmissionsCount: 26,
              applicantsWithCorrection: 5,
              totalCorrectionEvents: 6,
              correctionRatePct: 19.2,
              timeUntilFirstCorrection: stat(9, 4, 6, 12),
              correctionResponseTime: stat(2, 3, 1, 3),
              postCorrectionProcessing: stat(null, 0, null, null),
            },
            decisions: {
              approvedCount: 1,
              rejectedCount: 0,
              withdrawnCount: 0,
              approvalRatePct: 100,
            },
            survivalMedianDays: null,
            survivalP25Days: null,
            survivalP75Days: null,
          },
          progressionHistory: [],
          progressionPoints: [
            { observationDate: "2026-09-03", submissionFrontier: "2026-05-16", appointmentWlFrontier: null, reportedSubmissions: null, reportedCorrections: null, reportedAppointments: null, source: "individual_report" },
            { observationDate: "2026-09-30", submissionFrontier: "2026-06-09", appointmentWlFrontier: null, reportedSubmissions: null, reportedCorrections: null, reportedAppointments: null, source: "individual_report" },
            { observationDate: "2026-10-19", submissionFrontier: "2026-06-19", appointmentWlFrontier: null, reportedSubmissions: null, reportedCorrections: null, reportedAppointments: null, source: "individual_report" },
            { observationDate: "2026-11-11", submissionFrontier: "2026-07-04", appointmentWlFrontier: null, reportedSubmissions: null, reportedCorrections: null, reportedAppointments: null, source: "individual_report" },
            { observationDate: "2026-11-26", submissionFrontier: "2026-07-12", appointmentWlFrontier: null, reportedSubmissions: null, reportedCorrections: null, reportedAppointments: null, source: "individual_report" },
          ],
          weeklyActivity: [
            { weekStart: "2026-09-28", submissions: 3, corrections: 2, appointments: 5, cohortDaysCleared: 1 },
            { weekStart: "2026-10-05", submissions: 0, corrections: 2, appointments: 8, cohortDaysCleared: null },
            { weekStart: "2026-11-02", submissions: 2, corrections: 1, appointments: 0, cohortDaysCleared: 0 },
            { weekStart: "2026-11-16", submissions: 1, corrections: 0, appointments: 0, cohortDaysCleared: null },
          ],
          cohortProgress: [
            { month: "2026-06", total: 8, waitingList: 4, submissionInvited: 1, documentsSubmitted: 1, appointmentStage: 2, visaIssued: 0, visaRejected: 0, withdrawn: 0 },
            { month: "2026-07", total: 11, waitingList: 9, submissionInvited: 1, documentsSubmitted: 1, appointmentStage: 0, visaIssued: 0, visaRejected: 0, withdrawn: 0 },
            { month: "2026-10", total: 8, waitingList: 8, submissionInvited: 0, documentsSubmitted: 0, appointmentStage: 0, visaIssued: 0, visaRejected: 0, withdrawn: 0 },
          ],
          waitByInviteMonth: [
            { month: "2026-09", medianDays: 117, p25Days: 111, p75Days: 118, sampleSize: 7 },
            { month: "2026-10", medianDays: 115, p25Days: 115, p75Days: 115, sampleSize: 3 },
            { month: "2026-11", medianDays: 129, p25Days: 127, p75Days: 130, sampleSize: 5 },
          ],
          decisionComparison: {
            internalApprovedCount: 0,
            internalRejectedCount: 0,
            internalWithdrawnCount: 0,
            internalDecidedCount: 0,
            externalApprovedCount: 1,
            externalRejectedCount: 0,
            externalWithdrawnCount: 0,
            externalDecidedCount: 1,
            externalApprovalRatePct: 100,
            externalDecisionMedianDays: 14,
            externalDecisionSampleSize: 1,
          },
        },
      },
    },
  };

  return { ...base, ...overrides };
}

function makeSparseFixture(): AnalyticsDashboardPayload {
  const base = makeBaseFixture();
  return {
    ...base,
    summary: {
      ...base.summary,
      total: 3,
      withWaitingListDate: 2,
      activeApplicants: 3,
      medianWaitDays: null,
      waitSampleSize: 0,
    },
    embassyDistribution: [
      { consulate: "Islamabad", total: 3, active: 3, issued: 0, rejected: 0, sharePct: 100 },
      { consulate: "Karachi", total: 0, active: 0, issued: 0, rejected: 0, sharePct: 0 },
    ],
    statusDistribution: [
      { status: "WAITING_LIST", count: 3, sharePct: 100, isActive: true, isTerminal: false },
    ],
    activity: {
      monthlyByJoinDate: [{ period: "2026-11", total: 2, islamabad: 2, karachi: 0 }],
      weeklyByJoinDate: [],
      monthlyByEntryDate: [{ period: "2026-11", total: 3, islamabad: 3, karachi: 0 }],
      weeklyByEntryDate: [],
    },
    processingDurations: {
      stages: base.processingDurations.stages.map((s) => ({
        ...s,
        sampleSize: 0,
        medianDays: null,
        p25Days: null,
        p75Days: null,
        minDays: null,
        maxDays: null,
        available: false,
        note: "Insufficient paired dates",
      })),
      observedEndToEnd: { sampleSize: 0, medianDays: null, p25Days: null, p75Days: null, available: false },
    },
    intelligence: {
      ...base.intelligence,
      embassies: {
        ...base.intelligence.embassies,
        Islamabad: {
          ...base.intelligence.embassies.Islamabad,
          progressionPoints: [],
          waitByInviteMonth: [],
          weeklyActivity: [],
          cohortProgress: [],
          durations: {
            ...base.intelligence.embassies.Islamabad.durations,
            corrections: {
              ...base.intelligence.embassies.Islamabad.durations.corrections,
              eligibleSubmissionsCount: 2,
              applicantsWithCorrection: 1,
              totalCorrectionEvents: 1,
              correctionRatePct: null,
            },
          },
        },
      },
    },
  };
}

function makeWithDecisionsFixture(): AnalyticsDashboardPayload {
  const base = makeBaseFixture();
  return {
    ...base,
    summary: {
      ...base.summary,
      activeApplicants: 400,
      completedCases: 24,
      visaIssued: 19,
      visaRejected: 3,
      withdrawn: 2,
      decidedCases: 22,
      approvalRatePct: 86.4,
    },
    internalDecisions: {
      issued: 19,
      rejected: 3,
      withdrawn: 2,
      decided: 22,
      approvalRatePct: 86.4,
      monthlyOutcomes: [
        { month: "2026-09", issued: 6, rejected: 1 },
        { month: "2026-10", issued: 7, rejected: 1 },
        { month: "2026-11", issued: 6, rejected: 1 },
      ],
      medianDecisionDays: 9,
      decisionDurationSampleSize: 18,
    },
  };
}

function makeLongNamesFixture(): AnalyticsDashboardPayload {
  const base = makeBaseFixture();
  return {
    ...base,
    universities: {
      totalWithUniversity: 42,
      uniqueNormalizedCount: 6,
      items: [
        { key: "u1", displayName: "Rheinisch-Westfälische Technische Hochschule Aachen (RWTH Aachen University)", count: 14, rawVariants: [{ label: "RWTH Aachen", count: 14 }] },
        { key: "u2", displayName: "Ludwig-Maximilians-Universität München — International Graduate Center", count: 11, rawVariants: [{ label: "LMU Munich", count: 11 }] },
        { key: "u3", displayName: "Friedrich-Alexander-Universität Erlangen-Nürnberg (FAU)", count: 8, rawVariants: [{ label: "FAU", count: 8 }] },
        { key: "u4", displayName: "Hochschule für Technik und Wirtschaft Berlin University of Applied Sciences", count: 5, rawVariants: [{ label: "HTW Berlin", count: 5 }] },
        { key: "u5", displayName: "Technische Universität Kaiserslautern-Landau (RPTU)", count: 2, rawVariants: [{ label: "RPTU", count: 2 }] },
        { key: "u6", displayName: "Otto von Guericke University Magdeburg", count: 2, rawVariants: [{ label: "OVGU", count: 2 }] },
      ],
    },
  };
}

export default function AnalyticsVisualFixtures({
  dark = false,
  variant = "complete",
}: {
  dark?: boolean;
  variant?: string;
}) {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    return () => document.documentElement.classList.remove("dark");
  }, [dark]);

  if (variant === "loading") {
    return (
      <div className="p-2" data-testid="fixture-analytics-loading">
        <AnalyticsWorkspace fixtureLoading skipPageTitle />
      </div>
    );
  }

  if (variant === "error") {
    return (
      <div className="p-2" data-testid="fixture-analytics-error">
        <AnalyticsWorkspace
          fixtureError="Failed to load canonical analytics service (500)"
          skipPageTitle
        />
      </div>
    );
  }

  const data =
    variant === "sparse"
      ? makeSparseFixture()
      : variant === "with-decisions"
        ? makeWithDecisionsFixture()
        : variant === "long-names"
          ? makeLongNamesFixture()
          : makeBaseFixture();

  return (
    <div data-testid={`fixture-analytics-${variant}`}>
      <AnalyticsWorkspace fixtureData={data} skipPageTitle />
    </div>
  );
}
