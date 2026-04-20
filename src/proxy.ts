import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Public page routes that don't require authentication
const publicPageRoutes = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/error",
];

// Public API routes that don't require authentication
const publicApiRoutes = ["/api/auth"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;
  const userRole = req.auth?.user?.role;

  // Allow all public API routes
  const isPublicApiRoute = publicApiRoutes.some((route) =>
    pathname.startsWith(route)
  );
  if (isPublicApiRoute) {
    return NextResponse.next();
  }

  // Check if the current page route is public
  const isPublicPageRoute = publicPageRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Allow access to public page routes regardless of auth status
  if (isPublicPageRoute) {
    return NextResponse.next();
  }

  // For API routes (not public), return 401 if not authenticated
  if (pathname.startsWith("/api")) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Redirect to login if not authenticated (for page routes)
  if (!isLoggedIn) {
    const loginUrl = new URL("/auth/login", nextUrl);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control for /admin routes
  if (pathname.startsWith("/admin")) {
    if (userRole !== "admin") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  // Role-based access control for /moderator routes
  if (pathname.startsWith("/moderator")) {
    if (userRole !== "moderator" && userRole !== "admin") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except static files and _next internal routes
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
