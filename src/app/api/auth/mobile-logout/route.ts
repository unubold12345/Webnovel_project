import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "authjs.session-token";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    secure: false,
    sameSite: "lax",
    maxAge: 0,
  });

  const csrfCookie = request.cookies.get("authjs.csrf-token");
  if (csrfCookie) {
    response.cookies.set({
      name: "authjs.csrf-token",
      value: "",
      httpOnly: true,
      path: "/api/auth",
      secure: false,
      sameSite: "lax",
      maxAge: 0,
    });
  }

  return response;
}