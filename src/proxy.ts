import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * NextAuth middleware — protects /dashboard and /superadmin routes.
 *
 * Purpose:
 *   1. Enforce authentication (redirect to /login if no session)
 *   2. Enforce role-based access:
 *        /dashboard  → FABRICANT only
 *        /superadmin → SUPERADMIN only
 *   3. Revoke access for SUSPENDED accounts in real-time.
 *      The JWT has a 7-day maxAge, so without middleware a suspended user
 *      keeps access until their token expires. This middleware checks the
 *      `role` claim on every request — auth.ts sets it to "SUSPENDED" on
 *      session update, and the middleware blocks access when it sees that.
 *
 * Note: For a fully real-time revocation (without waiting for a session
 * refresh), you'd add a DB lookup here. That's intentionally omitted to
 * keep middleware fast — the tradeoff is up to 1 request of latency after
 * a suspension before the cached JWT reflects the new role.
 */
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Blocked entirely for suspended accounts
    if (token?.role === "SUSPENDED") {
      const loginUrl = new URL("/login?error=suspended", req.url);
      return NextResponse.redirect(loginUrl);
    }

    // Role guard: /dashboard requires FABRICANT
    if (path.startsWith("/dashboard") && token?.role !== "FABRICANT") {
      const loginUrl = new URL("/login?error=unauthorized", req.url);
      return NextResponse.redirect(loginUrl);
    }

    // Role guard: /superadmin requires SUPERADMIN
    if (path.startsWith("/superadmin") && token?.role !== "SUPERADMIN") {
      const loginUrl = new URL("/login?error=unauthorized", req.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Only run middleware for authenticated users on protected paths
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

// Run middleware only on dashboard + superadmin (not on public pages,
// API routes, or static assets — those stay fast and unguarded).
export const config = {
  matcher: ["/dashboard/:path*", "/superadmin/:path*"],
};
