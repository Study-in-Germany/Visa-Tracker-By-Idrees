import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsDashboardData } from "@/lib/analytics/dashboard-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const payload = await getAnalyticsDashboardData({
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      consulate: searchParams.get("consulate") || undefined,
      visaStatus: searchParams.get("visaStatus") || undefined,
      university: searchParams.get("university") || undefined,
      intake: searchParams.get("intake") || undefined,
    });

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api/analytics/dashboard] failed:", err);
    return NextResponse.json(
      { error: "Could not load analytics dashboard data." },
      { status: 500 }
    );
  }
}
