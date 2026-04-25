import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [recentChapters, recentVolumeChapters] = await Promise.all([
      db.chapter.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        include: {
          novel: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnail: true,
              novelType: true,
              hidden: true,
            },
          },
        },
      }),
      db.volumeChapter.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        include: {
          volume: {
            select: {
              id: true,
              volumeNumber: true,
              title: true,
              novel: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  thumbnail: true,
                  novelType: true,
                  hidden: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const allRecentChapters = [
      ...recentChapters
        .filter((ch) => !ch.novel.hidden)
        .map((ch) => ({
          id: ch.id,
          chapterNumber: ch.chapterNumber,
          title: ch.title,
          createdAt: ch.createdAt,
          viewCount: ch.viewCount,
          isVolumeChapter: false,
          volume: null,
          novel: ch.novel,
        })),
      ...recentVolumeChapters
        .filter((vch) => !vch.volume.novel.hidden)
        .map((vch) => ({
          id: vch.id,
          chapterNumber: vch.chapterNumber,
          title: vch.title,
          createdAt: vch.createdAt,
          viewCount: vch.viewCount,
          isVolumeChapter: true,
          volume: {
            id: vch.volume.id,
            volumeNumber: vch.volume.volumeNumber,
            title: vch.volume.title,
          },
          novel: vch.volume.novel,
        })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 15);

    return NextResponse.json(allRecentChapters);
  } catch (error) {
    console.error("Error fetching recent chapters:", error);
    return NextResponse.json(
      { error: "Сүүлийн бүлгүүдийг татахад алдаа гарлаа" },
      { status: 500 }
    );
  }
}