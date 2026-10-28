/** Rules for admin passwords. Shared by the seed script, the change-password API and the settings form. */
export const PASSWORD_MIN = 14;
const COMMON = ["password", "changeme", "admin", "letmein", "welcome", "visatracker", "qwerty"];

export const PASSWORD_RULES: { id: string; label: string; test: (p: string, email?: string) => boolean }[] = [
  { id: "len", label: `At least ${PASSWORD_MIN} characters`, test: (p) => p.length >= PASSWORD_MIN },
  { id: "lower", label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "upper", label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "num", label: "A number", test: (p) => /\d/.test(p) },
  { id: "sym", label: "A symbol", test: (p) => /[^A-Za-z0-9]/.test(p) },
  { id: "common", label: "No common words or your email name", test: (p, email) => {
    const l = p.toLowerCase();
    const name = email?.split("@")[0]?.toLowerCase();
    return !COMMON.some((w) => l.includes(w)) && !(name && name.length > 2 && l.includes(name));
  } },
];

/** First unmet rule as a sentence, or null when the password is acceptable. */
export function passwordProblem(password: string, email?: string): string | null {
  const failed = PASSWORD_RULES.find((r) => !r.test(password, email));
  return failed ? `must have: ${failed.label.toLowerCase()}` : null;
}
