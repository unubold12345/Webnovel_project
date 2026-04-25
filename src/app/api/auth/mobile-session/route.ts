import { NextRequest, NextResponse } from "next/server";
import { decode } from "@auth/core/jwt";

const SESSION_COOKIE_NAME = "authjs.session-token";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const decoded = await decode({
      token,
      secret: process.env.AUTH_SECRET!,
      salt: SESSION_COOKIE_NAME,
    });

    if (!decoded?.sub) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: decoded.sub as string,
        email: decoded.email as string,
        name: decoded.name as string,
        role: decoded.role as string,
        isRestricted: !!decoded.isRestricted,
        emailVerified: !!(decoded as any).emailVerified,
      },
    });
  } catch (error) {
    console.error("Mobile session error:", error);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}