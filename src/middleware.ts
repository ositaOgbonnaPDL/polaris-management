import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // If logged in but must change password,
    // redirect everything except the change-password page itself
    if (
      token?.mustChangePassword &&
      pathname !== "/change-password" &&
      !pathname.startsWith("/api/")
    ) {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }

    // Role-based route protection
    if (pathname.startsWith("/superadmin")) {
      if (token?.role !== "super_admin") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    if (pathname.startsWith("/finance")) {
      if (!["finance", "super_admin"].includes(token?.role as string)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    if (pathname.startsWith("/admin")) {
      if (!["admin", "super_admin"].includes(token?.role as string)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Only run middleware on authenticated requests
      // Unauthenticated requests are redirected to /login automatically
      authorized: ({ token }) => !!token,
    },
  },
);

// Which routes the middleware applies to
export const config = {
  matcher: [
    // Protect all routes except login, api/auth, and static files
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
