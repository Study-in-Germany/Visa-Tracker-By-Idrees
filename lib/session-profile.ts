import type { SessionInfo } from "@/hooks/useSession";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/permissions";

/**
 * Server-side session + non-sensitive profile metadata for header and sidebar hydration.
 * Passes `touch: false` so background polling / navigation never extends idle admin sessions.
 */
export async function getSessionInfo(): Promise<SessionInfo> {
  const actor = await getActor({ touch: false });
  if (actor.role === "admin") {
    return { role: "admin", email: actor.email };
  }
  if (actor.role === "applicant") {
    const applicant = await prisma.applicant.findUnique({
      where: { id: actor.applicantId },
      select: {
        publicId: true,
        name: true,
        university: true,
        consulate: true,
        visaStatus: true,
      },
    });
    if (!applicant) return { role: "guest" };
    return {
      role: "applicant",
      publicId: applicant.publicId,
      name: applicant.name ?? undefined,
      university: applicant.university ?? undefined,
      consulate: applicant.consulate ?? undefined,
      visaStatus: applicant.visaStatus ?? undefined,
    };
  }
  return { role: "guest" };
}
