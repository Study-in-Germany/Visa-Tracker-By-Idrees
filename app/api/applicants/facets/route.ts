import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/applicants/facets — filter options for the public tracker, taken from approved entries only.
export async function GET() {
  const [universities, intakes] = await Promise.all([
    prisma.applicant.groupBy({ by: ["university"], where: { approval: "APPROVED", university: { not: null } }, _count: { _all: true }, orderBy: { _count: { university: "desc" } }, take: 60 }),
    prisma.applicant.groupBy({ by: ["intake"], where: { approval: "APPROVED", intake: { not: null } }, _count: { _all: true } }),
  ]);
  return NextResponse.json(
    {
      universities: universities.filter((u) => u.university).map((u) => ({ value: u.university as string, count: u._count._all })).sort((a, b) => a.value.localeCompare(b.value)),
      intakes: intakes.filter((i) => i.intake).map((i) => ({ value: i.intake as string, count: i._count._all })).sort((a, b) => b.value.localeCompare(a.value)),
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
