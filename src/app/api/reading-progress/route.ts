import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decode } from "@auth/core/jwt";

const SESSION_COOKIE_NAME = "authjs.session-token";

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  // First try NextAuth session
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }

  // Then try mobile Bearer token
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

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json([]);
    }

    const progress = await db.readingProgress.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: {
        novel: {
          select: { id: true, title: true, slug: true, thumbnail: true, novelType: true },
        },
        chapter: {
          select: { id: true, chapterNumber: true, title: true },
        },
        volumeChapter: {
          include: {
            volume: {
              select: { id: true, volumeNumber: true, title: true },
            },
          },
        },
      },
    });

    return NextResponse.json(
      progress.map((p) => ({
        id: p.id,
        novel: p.novel,
        chapter: p.chapter,
        volumeChapter: p.volumeChapter,
        volume: p.volumeChapter?.volume || null,
        chapterNumber: p.chapterNumber,
        isVolumeChapter: p.isVolumeChapter,
        volumeId: p.volumeId,
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { 
      novelId, 
      chapterId, 
      chapterNumber,
      volumeChapterId,
      volumeId,
      isVolumeChapter = false 
    } = await req.json();

    const updateData: {
      chapterNumber: number;
      chapterId?: string | null;
      volumeChapterId?: string | null;
      volumeId?: string | null;
      isVolumeChapter?: boolean;
    } = {
      chapterNumber,
    };

    if (isVolumeChapter) {
      updateData.isVolumeChapter = true;
      updateData.volumeChapterId = volumeChapterId;
      updateData.volumeId = volumeId;
      updateData.chapterId = null;
    } else {
      updateData.isVolumeChapter = false;
      updateData.chapterId = chapterId;
      updateData.volumeChapterId = null;
      updateData.volumeId = null;
    }

    const progress = await db.readingProgress.upsert({
      where: {
        userId_novelId: { userId, novelId },
      },
      update: updateData,
      create: {
        userId,
        novelId,
        ...updateData,
      },
      include: {
        novel: {
          select: { id: true, title: true, slug: true, thumbnail: true, novelType: true },
        },
        chapter: {
          select: { id: true, chapterNumber: true, title: true },
        },
        volumeChapter: {
          include: {
            volume: {
              select: { id: true, volumeNumber: true, title: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      id: progress.id,
      novel: progress.novel,
      chapter: progress.chapter,
      volumeChapter: progress.volumeChapter,
      volume: progress.volumeChapter?.volume || null,
      chapterNumber: progress.chapterNumber,
      isVolumeChapter: progress.isVolumeChapter,
      volumeId: progress.volumeId,
    });
  } catch (error) {
    console.error("Failed to save progress:", error);
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
  }
}
