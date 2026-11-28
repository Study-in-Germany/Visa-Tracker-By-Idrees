import { getSessionInfo } from "@/lib/session-profile";
import { privateJson } from "@/lib/security/cache-policy";

export const dynamic = "force-dynamic";

// GET /api/session — current viewer role + header/sidebar profile summary.
export async function GET() {
  const info = await getSessionInfo();
  return privateJson(info);
}
