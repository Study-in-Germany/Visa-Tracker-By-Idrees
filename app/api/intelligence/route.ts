import { NextRequest, NextResponse } from "next/server";
import { getIntelligenceDashboardData } from "@/lib/forecasting/forecast-service";

export const dynamic = "force-dynamic";

// GET /api/intelligence?embassy=Islamabad
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const embassy = searchParams.get("embassy");
    const report = await getIntelligenceDashboardData();

    if (embassy === "Islamabad" || embassy === "Karachi") {
      return NextResponse.json(
        {
          modelVersion: report.modelVersion,
          generatedAt: report.generatedAt,
          datasetSummary: report.datasetSummary,
          embassy: report.embassies[embassy],
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/intelligence] failed:", err);
    return NextResponse.json({ error: "Could not compute embassy intelligence." }, { status: 500 });
  }
}
