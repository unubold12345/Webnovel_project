import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNovelViewCounts } from "@/lib/views";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ novelId: string }> }
) {
  try {
    const { novelId } = await params;

    const novel = await db.webnovel.findUnique({
      where: { id: novelId, hidden: false },
      include: {
        chapters: {
          orderBy: { chapterNumber: "asc" },
          select: {
            id: true,
            chapterNumber: true,
            title: true,
            viewCount: true,
          },
        },
        volumes: {
          orderBy: { volumeNumber: "asc" },
          include: {
            chapters: {
              orderBy: { chapterNumber: "asc" },
              select: {
                id: true,
                chapterNumber: true,
                title: true,
                viewCount: true,
              },
            },
          },
        },
      },
    });

    if (!novel) {
      return NextResponse.json({ error: "Зохиол олдсонгүй" }, { status: 404 });
    }

    const viewCounts = await getNovelViewCounts();
    const totalViews = viewCounts.get(novel.id) || 0;

    const regularChapterViews = novel.chapters.reduce(
      (sum, ch) => sum + ch.viewCount,
      0
    );
    const volumeChapterViews = novel.volumes.reduce(
      (sum, vol) => sum + vol.chapters.reduce((vs, ch) => vs + ch.viewCount, 0),
      0
    );

    return NextResponse.json({
      ...novel,
      totalViews: regularChapterViews + volumeChapterViews,
      volumes: novel.volumes.map((v) => ({
        id: v.id,
        volumeNumber: v.volumeNumber,
        title: v.title,
        thumbnail: v.thumbnail,
        chapters: v.chapters,
      })),
    });
  } catch (error) {
    console.error("Error fetching novel:", error);
    return NextResponse.json(
      { error: "Зохиол татахад алдаа гарлаа" },
      { status: 500 }
    );
  }
}