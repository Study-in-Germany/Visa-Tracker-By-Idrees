import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/authorization";
import { invalidateForecastCache } from "@/lib/forecasting/forecast-service";
import { privateJson } from "@/lib/security/cache-policy";

const patchSchema = z.object({
  kind: z.enum(["timeline", "queue"]),
  verificationStatus: z.enum(["PENDING_REVIEW", "APPROVED", "CONFLICTING", "REJECTED"]),
  conflictNotes: z.string().max(500).optional(),
});

// PATCH /api/admin/evidence/[id] — approve, reject, or flag external timeline / queue observation
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return privateJson({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.kind === "timeline") {
    const updated = await prisma.externalTimelineObservation.update({
      where: { id: params.id },
      data: {
        verificationStatus: parsed.data.verificationStatus,
        ...(parsed.data.conflictNotes !== undefined ? { conflictNotes: parsed.data.conflictNotes } : {}),
      },
    });
    invalidateForecastCache();
    return privateJson({ observation: updated });
  }

  const updated = await prisma.queueObservation.update({
    where: { id: params.id },
    data: {
      verificationStatus: parsed.data.verificationStatus,
      ...(parsed.data.conflictNotes !== undefined ? { notes: parsed.data.conflictNotes } : {}),
    },
  });
  invalidateForecastCache();
  return privateJson({ observation: updated });
}

// DELETE /api/admin/evidence/[id]?kind=timeline|queue
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const kind = new URL(req.url).searchParams.get("kind");
  if (kind === "queue") {
    await prisma.queueObservation.delete({ where: { id: params.id } });
  } else {
    await prisma.externalTimelineObservation.delete({ where: { id: params.id } });
  }
  invalidateForecastCache();
  return privateJson({ ok: true });
}
