import { NextRequest, NextResponse } from "next/server";
import {
  verifySessionToken, SESSION_COOKIE_NAME,
  verifyApplicantSessionToken, APPLICANT_SESSION_COOKIE_NAME,
} from "@/lib/auth";

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session) return NextResponse.redirect(new URL("/admin/login", req.url));
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get(APPLICANT_SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifyApplicantSessionToken(token) : null;
    if (!session) return NextResponse.redirect(new URL("/login", req.url));
    return NextResponse.next();
  }

  return NextResponse.next();
}
