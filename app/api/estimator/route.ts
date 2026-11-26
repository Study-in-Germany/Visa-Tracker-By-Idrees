import { NextRequest, NextResponse } from "next/server";
import { getConsulateModelStats, calculateInvitationEstimate } from "@/lib/estimator";

// GET /api/estimator?consulate=Islamabad
export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const consulateParam = p.get("consulate") || "Islamabad";
    if (consulateParam !== "Islamabad" && consulateParam !== "Karachi") {
      return NextResponse.json({ error: "Invalid consulate selection." }, { status: 400 });
    }

    const stats = await getConsulateModelStats(consulateParam);
    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err: any) {
    console.error("GET /api/estimator error:", err);
    return NextResponse.json({ error: err.message || "Failed to load estimator statistics." }, { status: 500 });
  }
}

// POST /api/estimator
// Body: { consulate: "Islamabad" | "Karachi", date: "YYYY-MM-DD" }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const { consulate, date } = body;
    if (consulate !== "Islamabad" && consulate !== "Karachi") {
      return NextResponse.json({ error: "Please select either Islamabad or Karachi consulate." }, { status: 400 });
    }

    if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Please provide a valid registration date (YYYY-MM-DD)." }, { status: 400 });
    }

    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date value." }, { status: 400 });
    }

    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);
    if (parsedDate > today) {
      return NextResponse.json({ error: "Waiting-list registration date cannot be in the future." }, { status: 400 });
    }

    const estimate = await calculateInvitationEstimate(consulate, date);
    return NextResponse.json(estimate);
  } catch (err: any) {
    console.error("POST /api/estimator error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate prediction estimate." }, { status: 500 });
  }
}
