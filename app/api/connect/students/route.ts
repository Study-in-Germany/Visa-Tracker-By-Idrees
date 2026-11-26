import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApplicantSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const q = p.get("q")?.trim();
  const university = p.get("university")?.trim();
  const program = p.get("program")?.trim();
  const degreeLevel = p.get("degreeLevel")?.trim();
  const intakeSeason = p.get("intakeSeason")?.trim();
  const intakeYear = p.get("intakeYear") ? parseInt(p.get("intakeYear")!) : undefined;
  const originCity = p.get("originCity")?.trim();
  const destinationCity = p.get("destinationCity")?.trim();
  const consulate = p.get("consulate")?.trim();
  const visaStatus = p.get("visaStatus")?.trim();
  const inGermanyParam = p.get("inGermany");
  const allowMessagesParam = p.get("allowMessages");
  const recommendations = p.get("recommendations") === "true";

  const page = Math.max(1, parseInt(p.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(p.get("pageSize") || "12")));
  const skip = (page - 1) * pageSize;

  const session = await getApplicantSession();

  // Public profiles only
  const where: any = {
    visibility: { in: ["NAMED", "ANONYMOUS"] },
  };

  if (q) {
    where.OR = [
      { displayName: { contains: q, mode: "insensitive" } },
      { university: { contains: q, mode: "insensitive" } },
      { program: { contains: q, mode: "insensitive" } },
      { originCity: { contains: q, mode: "insensitive" } },
      { destinationCity: { contains: q, mode: "insensitive" } },
    ];
  }

  if (university) where.university = { contains: university, mode: "insensitive" };
  if (program) where.program = { contains: program, mode: "insensitive" };
  if (degreeLevel) where.degreeLevel = degreeLevel;
  if (intakeSeason) where.intakeSeason = intakeSeason;
  if (intakeYear && !isNaN(intakeYear)) where.intakeYear = intakeYear;
  if (originCity) where.originCity = { contains: originCity, mode: "insensitive" };
  if (destinationCity) where.destinationCity = { contains: destinationCity, mode: "insensitive" };
  if (consulate) where.consulate = consulate;
  if (visaStatus) where.visaStatus = visaStatus;
  if (inGermanyParam === "true") where.inGermany = true;
  if (inGermanyParam === "false") where.inGermany = false;
  if (allowMessagesParam === "true") where.allowMessages = true;

  const [items, total] = await Promise.all([
    prisma.studentProfile.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        applicantId: true,
        displayName: true,
        university: true,
        program: true,
        degreeLevel: true,
        intakeSeason: true,
        intakeYear: true,
        originCity: true,
        destinationCity: true,
        consulate: true,
        visaStatus: true,
        inGermany: true,
        bio: true,
        visibility: true,
        allowMessages: true,
        updatedAt: true,
      },
    }),
    prisma.studentProfile.count({ where }),
  ]);

  // Sanitize anonymous profiles
  const sanitizedItems = items.map((s) => ({
    ...s,
    displayName: s.visibility === "ANONYMOUS" ? `Student #${s.id.slice(-4)}` : s.displayName,
    isSelf: session ? s.applicantId === session.applicantId : false,
  }));

  // Compute recommendations if requested and session exists
  let recs: any = null;
  if (recommendations && session) {
    const myProfile = await prisma.studentProfile.findUnique({
      where: { applicantId: session.applicantId },
    });

    const baseWhere = {
      applicantId: { not: session.applicantId },
      visibility: { in: ["NAMED", "ANONYMOUS"] as any },
    };

    const [sameUni, sameCity, sameIntake, recent] = await Promise.all([
      myProfile?.university
        ? prisma.studentProfile.findMany({
            where: { ...baseWhere, university: myProfile.university },
            take: 4,
            orderBy: { updatedAt: "desc" },
          })
        : [],
      myProfile?.destinationCity
        ? prisma.studentProfile.findMany({
            where: { ...baseWhere, destinationCity: myProfile.destinationCity },
            take: 4,
            orderBy: { updatedAt: "desc" },
          })
        : [],
      myProfile?.intakeSeason && myProfile?.intakeYear
        ? prisma.studentProfile.findMany({
            where: {
              ...baseWhere,
              intakeSeason: myProfile.intakeSeason,
              intakeYear: myProfile.intakeYear,
            },
            take: 4,
            orderBy: { updatedAt: "desc" },
          })
        : [],
      prisma.studentProfile.findMany({
        where: baseWhere,
        take: 4,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const formatList = (arr: any[]) =>
      arr.map((s) => ({
        ...s,
        displayName: s.visibility === "ANONYMOUS" ? `Student #${s.id.slice(-4)}` : s.displayName,
        isSelf: false,
      }));

    recs = {
      sameUniversity: formatList(sameUni),
      sameCity: formatList(sameCity),
      sameIntake: formatList(sameIntake),
      recentlyJoined: formatList(recent),
    };
  }

  return NextResponse.json({
    items: sanitizedItems,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    recommendations: recs,
  });
}
