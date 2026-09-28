import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "zendmail_session";

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// This only guards against unauthenticated access at the edge (fast,
// cookie-presence check). Session validity, email verification, and
// onboarding-completion checks happen against the database in each
// route's server layout, since those require a real DB round trip.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/contacts/:path*",
    "/segments/:path*",
    "/campaigns/:path*",
    "/analytics/:path*",
    "/automations/:path*",
    "/ai/:path*",
    "/workspace/:path*",
    "/admin/:path*",
    "/templates/:path*",
    "/forms/:path*",
    "/landing-pages/:path*",
    "/commerce/:path*",
    "/integrations/:path*",
  ],
};
