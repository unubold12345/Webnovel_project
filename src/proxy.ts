import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { decode as jwtDecode } from "@auth/core/jwt";

const publicPageRoutes = [
  "/",
  "/novels",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/error",
];

const authOnlyPageRoutes = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/error",
];

const publicApiRoutes = ["/api/auth", "/api/novels", "/api/health", "/api/dev/logo"];

function addCorsHeaders(response: NextResponse, origin: string | null) {
  const allowedOrigins = [
    "http://localhost:8081",
    "http://192.168.1.5:8081",
    "http://localhost:19006",
    "exp://192.168.1.5:8081",
    "exp://localhost:8081",
    "capacitor://localhost",
    "ionic://localhost",
  ];

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-CSRF-Token");
  }
  return response;
}

// Helper to inject Bearer token as cookie for mobile clients
async function injectBearerToken(request: NextRequest): Promise<NextRequest> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (token && !request.cookies.get("authjs.session-token")?.value) {
    // Verify the token is valid before injecting
    try {
      const decoded = await jwtDecode({
        token,
        secret: process.env.AUTH_SECRET!,
        salt: "authjs.session-token",
      });

      if (decoded?.sub) {
        // Clone the request and add the cookie
        const newHeaders = new Headers(request.headers);
        const cookieHeader = request.headers.get("cookie") || "";
        const newCookie = cookieHeader
          ? `${cookieHeader}; authjs.session-token=${token}`
          : `authjs.session-token=${token}`;
        newHeaders.set("cookie", newCookie);

        // Create new request with modified headers
        return new NextRequest(request.url, {
          method: request.method,
          headers: newHeaders,
          body: request.body,
        });
      }
    } catch {
      // Invalid token, don't inject
    }
  }

  return request;
}

async function handler(req: NextRequest) {
  const { nextUrl } = req;
  const origin = req.headers.get("origin");
  const pathname = nextUrl.pathname;

  // Handle CORS preflight requests before auth check
  if (req.method === "OPTIONS") {
    const allowedOrigins = [
      "http://localhost:8081",
      "http://192.168.1.5:8081",
      "http://localhost:19006",
      "exp://192.168.1.5:8081",
      "exp://localhost:8081",
      "capacitor://localhost",
      "ionic://localhost",
    ];

    const response = new NextResponse(null, { status: 204 });
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-CSRF-Token");
      response.headers.set("Access-Control-Max-Age", "86400");
    }
    return response;
  }

  const isPublicApiRoute = publicApiRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isPublicApiRoute) {
    const response = NextResponse.next();
    return addCorsHeaders(response, origin);
  }

  const isLoggedIn = !!(req as any).auth;
  const userRole = (req as any).auth?.user?.role;

  const isPublicPageRoute = publicPageRoutes.some((route) => {
    if (pathname === route) return true;
    if (route === "/novels") {
      // Allow /novels and /novels/{slug} but not /novels/{slug}/chapters/...
      return /^\/novels\/[^/]+$/.test(pathname);
    }
    return pathname.startsWith(route + "/");
  });

  const isAuthOnlyPageRoute = authOnlyPageRoutes.some((route) =>
    pathname === route || pathname.startsWith(route + "/")
  );

  if (isAuthOnlyPageRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (isPublicPageRoute) {
    const response = NextResponse.next();
    return addCorsHeaders(response, origin);
  }

  if (pathname.startsWith("/api")) {
    if (!isLoggedIn) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return addCorsHeaders(response, origin);
    }
    const response = NextResponse.next();
    return addCorsHeaders(response, origin);
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/auth/login", nextUrl);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin")) {
    if (userRole !== "admin" && userRole !== "moderator") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  if (pathname.startsWith("/moderator")) {
    if (userRole !== "moderator" && userRole !== "admin") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  const response = NextResponse.next();
  return addCorsHeaders(response, origin);
}

// Create auth-wrapped handler
const authWrappedHandler = auth(handler);

export default async function proxy(req: NextRequest) {
  // Inject Bearer token as cookie before auth processing
  const modifiedReq = await injectBearerToken(req);
  // Pass to auth-wrapped handler with empty context
  return authWrappedHandler(modifiedReq, { params: {} } as any);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};