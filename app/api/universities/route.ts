import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { apiError, forbidden, getActor, unauthorized } from "@/lib/permissions";
import { universitySchema } from "@/lib/validations";
import { pageMeta, parsePaging } from "@/lib/pagination";
import { programmeWhere, toUniversityDto, uniqueSlug } from "@/lib/universities";

const DEADLINE_WINDOWS: Record<string, number | "upcoming"> = { upcoming: "upcoming", "30": 30, "60": 60, "90": 90 };

// GET /api/universities?q=&city=&degree=BACHELOR,MASTER&intake=WINTER&deadline=upcoming|30|60|90&page=
// Programme filters narrow both which universities appear and which programmes are listed under them.
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const actor = await getActor();
  const admin = actor.role === "admin" && sp.get("includeUnpublished") === "1";

  const degrees = (sp.get("degree") || "").split(",").filter(Boolean);
  if (degrees.some((d) => !["BACHELOR", "MASTER", "PHD"].includes(d))) return apiError("Invalid degree filter", 400);
  const intake = sp.get("intake") || undefined;
  if (intake && !["SUMMER", "WINTER"].includes(intake)) return apiError("Invalid intake filter", 400);
  const deadline = sp.get("deadline");
  if (deadline && !(deadline in DEADLINE_WINDOWS)) return apiError("Invalid deadline filter", 400);

  const language = sp.get("language")?.trim().slice(0, 40) || undefined;
  const pw = programmeWhere({ degrees, intake, language, deadlineDays: deadline ? DEADLINE_WINDOWS[deadline] : undefined }, admin);
  const programmeFilterActive = degrees.length > 0 || !!intake || !!deadline || !!language;

  const where: Prisma.UniversityWhereInput = {};
  if (!admin) where.published = true;
  const city = sp.get("city")?.trim();
  if (city) where.city = { equals: city, mode: "insensitive" };
  const state = sp.get("state")?.trim();
  if (state) where.state = { equals: state, mode: "insensitive" };
  const type = sp.get("type")?.trim();
  if (type) where.institutionType = { equals: type, mode: "insensitive" };
  if (sp.get("withProgrammes") === "1") where.programmes = { some: { published: true } };
  const q = sp.get("q")?.trim().slice(0, 80);
  if (q) {
    const ci = { contains: q, mode: "insensitive" as const };
    where.OR = [{ name: ci }, { shortName: ci }, { city: ci }, { programmes: { some: { ...pw, name: ci } } }];
  }
  if (programmeFilterActive) where.programmes = { some: pw };

  const { page, pageSize, skip, take } = parsePaging(sp, 12);
  const [count, rows, facets] = await Promise.all([
    prisma.university.count({ where }),
    prisma.university.findMany({
      where, orderBy: { name: "asc" }, skip, take,
      include: { programmes: { where: pw, orderBy: [{ degreeLevel: "asc" }, { name: "asc" }] }, _count: { select: { programmes: true } } },
    }),
    Promise.all([
      prisma.university.findMany({ where: admin ? {} : { published: true }, distinct: ["state"], select: { state: true }, orderBy: { state: "asc" } }),
      prisma.university.findMany({ where: admin ? {} : { published: true }, distinct: ["institutionType"], select: { institutionType: true }, orderBy: { institutionType: "asc" } }),
    ]),
  ]);

  return NextResponse.json(
    { items: rows.map(toUniversityDto), ...pageMeta(count, page, pageSize), states: facets[0].map((x) => x.state).filter(Boolean), types: facets[1].map((x) => x.institutionType).filter(Boolean) },
    { headers: admin ? undefined : { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}

// POST /api/universities — admin only.
export async function POST(req: NextRequest) {
  const actor = await getActor();
  if (actor.role !== "admin") return actor.role === "guest" ? unauthorized() : forbidden();
  const parsed = universitySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  const university = await prisma.university.create({
    data: {
      name: d.name, slug: await uniqueSlug(d.name), city: d.city, state: d.state || null,
      website: d.website, description: d.description || null, published: d.published ?? true,
    },
    include: { programmes: true },
  });
  return NextResponse.json({ university: toUniversityDto(university) }, { status: 201 });
}
