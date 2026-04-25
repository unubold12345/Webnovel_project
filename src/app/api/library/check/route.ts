import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decode } from "@auth/core/jwt";

const SESSION_COOKIE_NAME = "authjs.session-token";

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (token) {
    try {
      const decoded = await decode({
        token,
        secret: process.env.AUTH_SECRET!,
        salt: SESSION_COOKIE_NAME,
      });

      if (decoded?.sub) {
        return decoded.sub as string;
      }
    } catch {
      // Invalid token
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ isSaved: false });
    }

    const { searchParams } = new URL(req.url);
    const novelId = searchParams.get("novelId");

    if (!novelId) {
      return NextResponse.json({ error: "Novel ID is required" }, { status: 400 });
    }

    const savedNovel = await db.savedNovel.findUnique({
      where: {
        userId_novelId: { userId: userId, novelId },
      },
    });

    return NextResponse.json({
      isSaved: !!savedNovel,
      readingStatus: savedNovel?.readingStatus || null,
    });
  } catch (error) {
    console.error("Failed to check saved status:", error);
    return NextResponse.json({ error: "Failed to check saved status" }, { status: 500 });
  }
}
