import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");
  const authCookie = request.cookies.get("admin_auth");

  if (isDashboard && !authCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect root to dashboard (which will then check auth)
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Prevent logged-in users from seeing login pages
  const isAuthPage = request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/two-factor";
  if (isAuthPage && authCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login", "/two-factor"],
};
