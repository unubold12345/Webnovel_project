import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { encode } from "@auth/core/jwt";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
const SESSION_COOKIE_NAME = "authjs.session-token";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (user.isRestricted) {
      return NextResponse.json(
        { error: "Account is restricted" },
        { status: 403 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    const sessionToken = await encode({
      token: {
        sub: user.id,
        id: user.id,
        email: user.email,
        name: user.username,
        role: user.role,
        isRestricted: user.isRestricted,
        emailVerified: !!user.emailVerified,
      },
      secret: process.env.AUTH_SECRET!,
      maxAge: SESSION_MAX_AGE,
      salt: SESSION_COOKIE_NAME,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.username,
        role: user.role,
        isRestricted: user.isRestricted,
        emailVerified: !!user.emailVerified,
      },
      success: true,
      sessionToken,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      path: "/",
      secure: false,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error("Mobile login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}