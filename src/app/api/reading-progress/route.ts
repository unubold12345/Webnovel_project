import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json([]);
    }

    const progress = await db.readingProgress.findMany({
      where: { userId: session.user.id },
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
          select: { id: true, chapterNumber: true, title: true },
        },
      },
    });

    return NextResponse.json(
      progress.map((p) => ({
        novel: p.novel,
        chapter: p.chapter,
        volumeChapter: p.volumeChapter,
        chapterNumber: p.chapterNumber,
        isVolumeChapter: p.isVolumeChapter,
        volumeId: p.volumeId,
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
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
        userId_novelId: { userId: session.user.id, novelId },
      },
      update: updateData,
      create: {
        userId: session.user.id,
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
          select: { id: true, chapterNumber: true, title: true },
        },
      },
    });

    return NextResponse.json({
      novel: progress.novel,
      chapter: progress.chapter,
      volumeChapter: progress.volumeChapter,
      chapterNumber: progress.chapterNumber,
      isVolumeChapter: progress.isVolumeChapter,
      volumeId: progress.volumeId,
    });
  } catch (error) {
    console.error("Failed to save progress:", error);
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
  }
}
