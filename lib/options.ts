import { APPROVAL_LABELS, CONSULATES, GENDER_LABELS, VISA_STATUS_LABELS, VISA_STATUS_ORDER } from "./constants";

type Opt = { value: string; label: string };
const fromMap = (m: Record<string, string>): Opt[] => Object.entries(m).map(([value, label]) => ({ value, label }));

export const GENDER_OPTIONS: Opt[] = fromMap(GENDER_LABELS);
export const CONSULATE_FIELD_OPTIONS: Opt[] = CONSULATES.map((c) => ({ value: c, label: c }));
export const VISA_STATUS_OPTIONS: Opt[] = VISA_STATUS_ORDER.map((value) => ({ value, label: VISA_STATUS_LABELS[value] }));
export const APPROVAL_OPTIONS: Opt[] = fromMap(APPROVAL_LABELS);

export const PROVINCE_OPTIONS: Opt[] = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Azad Jammu & Kashmir",
  "Gilgit-Baltistan",
  "Islamabad Capital Territory",
].map((p) => ({ value: p, label: p }));

export const VISA_TYPE_OPTIONS: Opt[] = [
  { value: "Study", label: "Study" },
  { value: "Language", label: "Language" },
  { value: "FRV", label: "FRV (family reunion)" },
];

export const INTAKE_SEASONS: Opt[] = [
  { value: "Winter", label: "Winter" },
  { value: "Summer", label: "Summer" },
];

/** Years offered for an intake: last year through four years ahead. */
export function intakeYearOptions(): Opt[] {
  const y = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => String(y - 1 + i)).map((v) => ({ value: v, label: v }));
}
