import { requireAdmin } from "@/lib/auth/authorization";
import { processEmailQueue } from "@/lib/email";
import { privateJson } from "@/lib/security/cache-policy";

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const result = await processEmailQueue({ limit: 40, maxDurationMs: 15_000 });
  return privateJson(result);
}
