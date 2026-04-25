import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; chapterNumber: string }> }
) {
  try {
    const { slug, chapterNumber } = await params;
    const session = await auth();
    const chapterNum = parseInt(chapterNumber);

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

    const chapter = await db.chapter.findUnique({
      where: {
        novelId_chapterNumber: {
          novelId: novel.id,
          chapterNumber: chapterNum,
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: "Бүлэг олдсонгүй" }, { status: 404 });
    }

    const prevChapter =
      chapterNum > 1
        ? await db.chapter.findUnique({
            where: {
              novelId_chapterNumber: {
                novelId: novel.id,
                chapterNumber: chapterNum - 1,
              },
            },
            select: { chapterNumber: true, title: true },
          })
        : null;

    const nextChapter = await db.chapter.findUnique({
      where: {
        novelId_chapterNumber: {
          novelId: novel.id,
          chapterNumber: chapterNum + 1,
        },
      },
      select: { chapterNumber: true, title: true },
    });

    const totalChapters = await db.chapter.count({
      where: { novelId: novel.id },
    });

    if (session?.user?.id) {
      await db.readingProgress.upsert({
        where: {
          userId_novelId: {
            userId: session.user.id,
            novelId: novel.id,
          },
        },
        update: {
          chapterId: chapter.id,
          chapterNumber: chapter.chapterNumber,
          isVolumeChapter: false,
          volumeId: null,
          volumeChapterId: null,
        },
        create: {
          userId: session.user.id,
          novelId: novel.id,
          chapterId: chapter.id,
          chapterNumber: chapter.chapterNumber,
          isVolumeChapter: false,
        },
      });
    }

    return NextResponse.json({
      ...chapter,
      novel,
      prevChapter,
      nextChapter,
      totalChapters,
    });
  } catch (error) {
    console.error("Error fetching chapter:", error);
    return NextResponse.json(
      { error: "Бүлэг татахад алдаа гарлаа" },
      { status: 500 }
    );
  }
}