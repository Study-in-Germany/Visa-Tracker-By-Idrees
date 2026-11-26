import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const COMMON_ALIASES: Record<string, string> = {
  "tu chemnitz": "Technische Universität Chemnitz",
  "chemnitz": "Technische Universität Chemnitz",
  "tum": "Technische Universität München",
  "tu munich": "Technische Universität München",
  "lmu": "Ludwig-Maximilians-Universität München",
  "rwth": "Rheinisch-Westfälische Technische Hochschule Aachen",
  "rwth aachen": "Rheinisch-Westfälische Technische Hochschule Aachen",
  "tu darmstadt": "Technische Universität Darmstadt",
  "tu dresden": "Technische Universität Dresden",
  "fau": "Friedrich-Alexander-Universität Erlangen-Nürnberg",
  "tu berlin": "Technische Universität Berlin",
  "hu berlin": "Humboldt-Universität zu Berlin",
  "kit": "Karlsruher Institut für Technologie",
  "karlsruhe": "Karlsruher Institut für Technologie",
  "uni stuttgart": "Universität Stuttgart",
  "uni bonn": "Rheinische Friedrich-Wilhelms-Universität Bonn",
  "uni heidelberg": "Ruprecht-Karls-Universität Heidelberg",
};

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const q = p.get("q")?.trim() || "";

  if (!q) {
    // Return top universities by default
    const items = await prisma.university.findMany({
      where: { published: true },
      select: { id: true, name: true, shortName: true, city: true },
      take: 20,
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ items });
  }

  const normalized = q.toLowerCase();
  const aliasMatch = COMMON_ALIASES[normalized];
  const searchTerm = aliasMatch || q;

  const items = await prisma.university.findMany({
    where: {
      published: true,
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { shortName: { contains: searchTerm, mode: "insensitive" } },
        { city: { contains: searchTerm, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      shortName: true,
      city: true,
    },
    take: 15,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ items });
}

