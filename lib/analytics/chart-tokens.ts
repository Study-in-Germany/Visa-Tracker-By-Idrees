import {
  VISA_STATUS_HEX,
  VISA_STATUS_LABELS,
  VISA_STATUS_ORDER,
  VISA_STATUS_SHORT,
} from "@/lib/constants";

/**
 * Restrained analytical palette designed for the pure-white light theme and
 * neutral-black/charcoal dark theme without bright-blue saturation.
 */
export interface AnalyticsChartPalette {
  isDark: boolean;
  primarySeries: string;
  secondarySeries: string;
  tertiarySeries: string;
  islamabadBar: string;
  karachiBar: string;
  submissionFrontier: string;
  appointmentFrontier: string;
  anomalyMarker: string;
  rangeBand: string;
  medianMarker: string;
  lowSampleFill: string;
  gridLine: string;
  axisText: string;
  inkPrimary: string;
  inkSecondary: string;
  surfaceCard: string;
  surfaceSunk: string;
  borderLine: string;
  semanticIssued: string;
  semanticRejected: string;
  semanticWarning: string;
  semanticCorrection: string;
}

export const LIGHT_ANALYTICS_PALETTE: AnalyticsChartPalette = {
  isDark: false,
  primarySeries: "#0f172a",
  secondarySeries: "#64748b",
  tertiarySeries: "#0f766e",
  islamabadBar: "#1e293b",
  karachiBar: "#94a3b8",
  submissionFrontier: "#0f172a",
  appointmentFrontier: "#0f766e",
  anomalyMarker: "#d97706",
  rangeBand: "#cbd5e1",
  medianMarker: "#0f172a",
  lowSampleFill: "#cbd5e1",
  gridLine: "#e2e8f0",
  axisText: "#64748b",
  inkPrimary: "#0f172a",
  inkSecondary: "#475569",
  surfaceCard: "#ffffff",
  surfaceSunk: "#f8fafc",
  borderLine: "#e2e8f0",
  semanticIssued: "#16a34a",
  semanticRejected: "#dc2626",
  semanticWarning: "#d97706",
  semanticCorrection: "#d97706",
};

export const DARK_ANALYTICS_PALETTE: AnalyticsChartPalette = {
  isDark: true,
  primarySeries: "#fafafa",
  secondarySeries: "#737373",
  tertiarySeries: "#2dd4bf",
  islamabadBar: "#e5e5e5",
  karachiBar: "#737373",
  submissionFrontier: "#f5f5f5",
  appointmentFrontier: "#2dd4bf",
  anomalyMarker: "#fbbf24",
  rangeBand: "#3f3f46",
  medianMarker: "#fafafa",
  lowSampleFill: "#3f3f46",
  gridLine: "#272727",
  axisText: "#8a8a8a",
  inkPrimary: "#fafafa",
  inkSecondary: "#a3a3a3",
  surfaceCard: "#141414",
  surfaceSunk: "#1c1c1c",
  borderLine: "#272727",
  semanticIssued: "#4ade80",
  semanticRejected: "#f87171",
  semanticWarning: "#fbbf24",
  semanticCorrection: "#fbbf24",
};

export const ANALYTICS_STATUS_META = {
  order: VISA_STATUS_ORDER,
  labels: VISA_STATUS_LABELS,
  shortLabels: VISA_STATUS_SHORT,
  hex: VISA_STATUS_HEX,
};
