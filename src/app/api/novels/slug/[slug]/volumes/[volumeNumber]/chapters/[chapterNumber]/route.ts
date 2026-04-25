import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ slug: string; volumeNumber: string; chapterNumber: string }>;
  }
) {
  try {
    const { slug, volumeNumber, chapterNumber } = await params;
    const session = await auth();
    const volumeNum = parseInt(volumeNumber);
    const chapterNum = parseFloat(chapterNumber);

    const novel = await db.webnovel.findUnique({
      where: { slug },
      select: { id: true, title: true, slug: true, novelType: true, hidden: true, publisherId: true },
    });

    if (!novel) {
      return NextResponse.json({ error: "Зохиол олдсонгүй" }, { status: 404 });
    }

    const isOwner = novel.publisherId === session?.user?.id;
    const isStaff = session?.user?.role === "admin" || session?.user?.role === "moderator";
    if (novel.hidden && !isOwner && !isStaff) {
      return NextResponse.json({ error: "Зохиол олдсонгүй" }, { status: 404 });
    }

    const volume = await db.volume.findUnique({
      where: {
        novelId_volumeNumber: {
          novelId: novel.id,
          volumeNumber: volumeNum,
        },
      },
    });

    if (!volume) {
      return NextResponse.json({ error: "Боть олдсонгүй" }, { status: 404 });
    }

    const chapter = await db.volumeChapter.findUnique({
      where: {
        volumeId_chapterNumber: {
          volumeId: volume.id,
          chapterNumber: chapterNum,
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "Бүлэг олдсонгүй" }, { status: 404 });
    }

    const allChapters = await db.volumeChapter.findMany({
      where: { volumeId: volume.id },
      orderBy: { chapterNumber: "asc" },
      select: { chapterNumber: true, title: true },
    });

    const currentIndex = allChapters.findIndex(
      (c) => c.chapterNumber === chapterNum
    );

    const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
    const nextChapter =
      currentIndex < allChapters.length - 1
        ? allChapters[currentIndex + 1]
        : null;

    if (session?.user?.id) {
      await db.readingProgress.upsert({
        where: {
          userId_novelId: {
            userId: session.user.id,
            novelId: novel.id,
          },
        },
        update: {
          volumeChapterId: chapter.id,
          chapterNumber: Math.floor(chapter.chapterNumber),
          isVolumeChapter: true,
          volumeId: volume.id,
          chapterId: null,
        },
        create: {
          userId: session.user.id,
          novelId: novel.id,
          volumeChapterId: chapter.id,
          chapterNumber: Math.floor(chapter.chapterNumber),
          isVolumeChapter: true,
          volumeId: volume.id,
        },
      });
    }

    return NextResponse.json({
      ...chapter,
      novel,
      volume: {
        id: volume.id,
        volumeNumber: volume.volumeNumber,
        title: volume.title,
      },
      prevChapter,
      nextChapter,
      allChapters,
    });
  } catch (error) {
    console.error("Error fetching volume chapter:", error);
    return NextResponse.json(
      { error: "Бүлэг татахад алдаа гарлаа" },
      { status: 500 }
    );
  }
}