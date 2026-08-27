import { CONSULATE_CODES } from "@/lib/constants";

// Builds a public tracking code like PK-ISB-10482
export function buildPublicId(consulate: string, sequence: number) {
  const code = CONSULATE_CODES[consulate] || "GEN";
  return `PK-${code}-${String(sequence).padStart(5, "0")}`;
}

// Generates a short, easy-to-share access code for applicant self-login,
// e.g. "7K4T-92XQ". Not meant to be a high-security password — just a
// private key paired with the public tracking ID so applicants can find
// and update their own entry without a full account system.
export function generateAccessCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  const part = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${part()}-${part()}`;
}
