import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { applicantLoginSchema } from "@/lib/validations";
import { createApplicantSessionToken, applicantSessionCookieOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = applicantLoginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { publicId, accessCode } = parsed.data;
  const applicant = await prisma.applicant.findUnique({ where: { publicId: publicId.toUpperCase() } });
  if (!applicant) return NextResponse.json({ error: "Invalid Tracking ID or Access Code" }, { status: 401 });

  const ok = await bcrypt.compare(accessCode.toUpperCase(), applicant.accessCodeHash);
  if (!ok) return NextResponse.json({ error: "Invalid Tracking ID or Access Code" }, { status: 401 });

  const token = await createApplicantSessionToken(applicant.id, applicant.publicId);
  const res = NextResponse.json({ ok: true });
  const opts = applicantSessionCookieOptions();
  res.cookies.set(opts.name, token, opts);
  return res;
}
