import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, getActor } from "@/lib/permissions";
import { pageMeta, parsePaging } from "@/lib/pagination";
import { buildListQuery, programmeInclude, toRow } from "@/lib/programmes";

// GET /api/programmes?q=&uni=&city=&field=&degree=MASTER&intake=WINTER&language=&ielts=6.5&tuitionFree=1&route=UNI_ASSIST
//     &deadline=open|30|60|90&ids=a,b&sort=university|deadline|ielts|updated|name&dir=asc|desc&page=
// Public list of published programmes. Admins can pass includeHidden=1 to also see unpublished ones.
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const actor = await getActor();
  const admin = actor.role === "admin" && sp.get("includeHidden") === "1";

  const query = buildListQuery(sp, admin);
  if (query.error) return apiError(query.error, 400);
  const { page, pageSize, skip, take } = parsePaging(sp, 20);

  const visible = admin ? {} : { published: true, verification: { not: "NEEDS_REVIEW" as const }, university: { published: true } };
  const [count, rows, fields, cities, unis] = await Promise.all([
    prisma.programme.count({ where: query.where }),
    prisma.programme.findMany({ where: query.where, orderBy: query.orderBy, skip, take, include: programmeInclude }),
    prisma.programme.findMany({ where: { ...visible, field: { not: null } }, distinct: ["field"], select: { field: true }, orderBy: { field: "asc" } }),
    prisma.university.findMany({ where: { published: true, programmes: { some: visible } }, distinct: ["city"], select: { city: true }, orderBy: { city: "asc" } }),
    prisma.university.findMany({ where: { published: true, programmes: { some: visible } }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 300 }),
  ]);

  return NextResponse.json(
    { items: rows.map(toRow), ...pageMeta(count, page, pageSize), facets: { fields: fields.map((f) => f.field!), cities: cities.map((c) => c.city), universities: unis } },
    { headers: admin ? undefined : { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
  );
}
