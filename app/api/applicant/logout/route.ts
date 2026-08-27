import { NextResponse } from "next/server";
import { applicantSessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const opts = applicantSessionCookieOptions();
  res.cookies.set(opts.name, "", { ...opts, maxAge: 0 });
  return res;
}
