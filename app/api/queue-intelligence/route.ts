import { NextRequest, NextResponse } from "next/server";
import { CONSULATES } from "@/lib/constants";
import { getEmbassyQueueIntelligence } from "@/lib/queue-intelligence";
import { calculateInvitationEstimate } from "@/lib/estimator";

// GET /api/queue-intelligence?consulate=Islamabad&waitingListDate=2026-07-07
// Public, cacheable embassy queue intelligence and optional date-based invitation window.
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const consulate = sp.get("consulate") || "Islamabad";
  if (!CONSULATES.includes(consulate)) {
    return NextResponse.json({ error: "Invalid consulate selection." }, { status: 400 });
  }

  const wlDate = sp.get("waitingListDate") || "";
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(wlDate) && !Number.isNaN(new Date(`${wlDate}T00:00:00Z`).getTime());

  try {
    const [intelligence, estimate] = await Promise.all([
      getEmbassyQueueIntelligence(consulate),
      validDate && (consulate === "Islamabad" || consulate === "Karachi")
        ? calculateInvitationEstimate(consulate, wlDate).catch(() => null)
        : Promise.resolve(null),
    ]);

    return NextResponse.json(
      { intelligence, estimate },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (err) {
    console.error("GET /api/queue-intelligence failed:", err);
    return NextResponse.json({ error: "Could not load queue intelligence." }, { status: 500 });
  }
}
