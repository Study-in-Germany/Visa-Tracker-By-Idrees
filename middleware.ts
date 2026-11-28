import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  APPLICANT_SESSION_COOKIE_NAME,
} from "@/lib/auth/session-policy";
import {
  PRIVATE_NO_STORE_HEADERS,
  applyPrivateNoStoreHeaders,
} from "@/lib/security/cache-policy";
import { verifyCsrfOrigin } from "@/lib/security/csrf";

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/accommodation/new",
    "/accommodation/:id/edit",
    "/api/:path*",
  ],
};

function hasValidTokenShape(token: string | undefined | null): boolean {
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
}

function nextWithPathname(req: NextRequest, privateNoStore = false): NextResponse {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-vt-pathname", req.nextUrl.pathname);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  return privateNoStore ? applyPrivateNoStoreHeaders(res) : res;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    // Cron endpoints authenticate with Bearer CRON_SECRET, not browser cookies
    if (!pathname.startsWith("/api/cron/")) {
      if (!verifyCsrfOrigin(req)) {
        return NextResponse.json(
          { error: "Cross-origin request blocked." },
          { status: 403, headers: PRIVATE_NO_STORE_HEADERS }
        );
      }
    }

    const isPrivateApi =
      pathname === "/api/session" ||
      pathname.startsWith("/api/applicant/") ||
      pathname.startsWith("/api/admin/");
    return nextWithPathname(req, isPrivateApi);
  }

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return nextWithPathname(req, true);
    }
    const token = req.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    if (!hasValidTokenShape(token)) {
      const loginUrl = new URL("/admin/login", req.url);
      if (pathname !== "/admin" || search) {
        loginUrl.searchParams.set("next", `${pathname}${search}`);
      }
      return applyPrivateNoStoreHeaders(NextResponse.redirect(loginUrl));
    }
    return nextWithPathname(req, true);
  }

  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get(APPLICANT_SESSION_COOKIE_NAME)?.value;
    if (!hasValidTokenShape(token)) {
      const loginUrl = new URL("/login", req.url);
      if (pathname !== "/dashboard" || search) {
        loginUrl.searchParams.set("next", `${pathname}${search}`);
      }
      return applyPrivateNoStoreHeaders(NextResponse.redirect(loginUrl));
    }
    return nextWithPathname(req, true);
  }

  if (pathname === "/accommodation/new" || /^\/accommodation\/[^/]+\/edit$/.test(pathname)) {
    const applicantToken = req.cookies.get(APPLICANT_SESSION_COOKIE_NAME)?.value;
    const adminToken = req.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
    if (!hasValidTokenShape(applicantToken) && !hasValidTokenShape(adminToken)) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", `${pathname}${search}`);
      return applyPrivateNoStoreHeaders(NextResponse.redirect(loginUrl));
    }
    return nextWithPathname(req, true);
  }

  return nextWithPathname(req, false);
}
