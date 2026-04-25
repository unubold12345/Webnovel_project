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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { novelId } = await params;

    const savedNovel = await db.savedNovel.findUnique({
      where: {
        userId_novelId: { userId: userId, novelId },
      },
    });

    if (!savedNovel) {
      return NextResponse.json({ error: "Saved novel not found" }, { status: 404 });
    }

    await db.savedNovel.delete({
      where: { id: savedNovel.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove saved novel:", error);
    return NextResponse.json({ error: "Failed to remove saved novel" }, { status: 500 });
  }
}
