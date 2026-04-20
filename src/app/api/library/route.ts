import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const savedNovels = await db.savedNovel.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        novel: {
          select: {
            id: true,
            title: true,
            slug: true,
            author: true,
            thumbnail: true,
            novelType: true,
            status: true,
            totalChapters: true,
            totalVolumes: true,
            chapters: {
              select: {
                id: true,
                chapterNumber: true,
                title: true,
                createdAt: true,
              },
              orderBy: { chapterNumber: "desc" },
              take: 1,
            },
            volumes: {
              select: {
                id: true,
                volumeNumber: true,
                title: true,
                chapters: {
                  select: {
                    id: true,
                    chapterNumber: true,
                    title: true,
                    createdAt: true,
                  },
                  orderBy: { chapterNumber: "desc" },
                  take: 1,
                },
              },
              orderBy: { volumeNumber: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    // Fetch reading progress for each novel
    const readingProgress = await db.readingProgress.findMany({
      where: { userId: session.user.id },
      include: {
        chapter: {
          select: { id: true, chapterNumber: true, title: true },
        },
        volumeChapter: {
          select: { id: true, chapterNumber: true, title: true },
        },
      },
    });

    // Create a map of novelId to progress
    const progressMap = new Map();
    readingProgress.forEach((p) => {
      progressMap.set(p.novelId, p);
    });

    const formattedSavedNovels = savedNovels.map((saved: any) => {
      const novel = saved.novel;
      const progress: any = progressMap.get(novel.id);
      
      // Calculate uploaded chapters/volumes
      const isLightNovel = novel.novelType === "light_novel";
      let uploadedChapters = 0;
      let uploadedVolumes = 0;
      
      if (isLightNovel) {
        uploadedVolumes = novel.volumes.length;
        uploadedChapters = novel.volumes.reduce((sum: number, vol: any) => sum + (vol.chapters?.length || 0), 0);
      } else {
        uploadedChapters = novel.chapters.length;
      }

      // Calculate progress percentage
      let progressPercent = 0;
      if (isLightNovel && novel.totalVolumes > 0) {
        progressPercent = Math.round((uploadedVolumes / novel.totalVolumes) * 100);
      } else if (!isLightNovel && novel.totalChapters > 0) {
        progressPercent = Math.round((uploadedChapters / novel.totalChapters) * 100);
      }

      // Get latest chapter info
      let latestChapter = null;
      if (isLightNovel && novel.volumes.length > 0) {
        const latestVolume = novel.volumes[0];
        if (latestVolume.chapters && latestVolume.chapters.length > 0) {
          latestChapter = latestVolume.chapters[0];
        }
      } else if (!isLightNovel && novel.chapters.length > 0) {
        latestChapter = novel.chapters[0];
      }

      // Look up volume info for light novels with reading progress
      let volumeInfo = null;
      if (progress?.isVolumeChapter && progress?.volumeId && novel.volumes) {
        const volume = novel.volumes.find((v: any) => v.id === progress.volumeId);
        if (volume) {
          volumeInfo = {
            volumeNumber: volume.volumeNumber,
            volumeTitle: volume.title,
          };
        }
      }

      return {
        id: saved.id,
        novelId: novel.id,
        title: novel.title,
        slug: novel.slug,
        author: novel.author,
        thumbnail: novel.thumbnail,
        novelType: novel.novelType,
        status: novel.status,
        totalChapters: novel.totalChapters,
        totalVolumes: novel.totalVolumes,
        uploadedChapters,
        uploadedVolumes,
        progressPercent,
        latestChapter,
        savedAt: saved.createdAt,
        readingStatus: saved.readingStatus,
        readingProgress: progress
          ? {
              chapterNumber: progress.chapterNumber,
              chapterTitle: progress.isVolumeChapter
                ? progress.volumeChapter?.title
                : progress.chapter?.title,
              updatedAt: progress.updatedAt,
              isVolumeChapter: progress.isVolumeChapter,
              volumeId: progress.volumeId,
              volumeNumber: volumeInfo?.volumeNumber,
              volumeTitle: volumeInfo?.volumeTitle,
            }
          : null,
      };
    });

    return NextResponse.json(formattedSavedNovels);
  } catch (error) {
    console.error("Failed to fetch library:", error);
    return NextResponse.json({ error: "Failed to fetch library" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { novelId, readingStatus } = await req.json();

    if (!novelId) {
      return NextResponse.json({ error: "Novel ID is required" }, { status: 400 });
    }

    // Check if already saved
    const existing = await db.savedNovel.findUnique({
      where: {
        userId_novelId: { userId: session.user.id, novelId },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Novel already saved" }, { status: 409 });
    }

    const savedNovel = await db.savedNovel.create({
      data: {
        userId: session.user.id,
        novelId,
        readingStatus: readingStatus || "plan_to_read",
      },
      include: {
        novel: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
          },
        },
      },
    });

    return NextResponse.json(savedNovel);
  } catch (error) {
    console.error("Failed to save novel:", error);
    return NextResponse.json({ error: "Failed to save novel" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { novelId, readingStatus } = await req.json();

    if (!novelId || !readingStatus) {
      return NextResponse.json(
        { error: "Novel ID and reading status are required" },
        { status: 400 }
      );
    }

    // Validate reading status
    const validStatuses = ["reading", "completed", "on_hold", "plan_to_read", "dropped"];
    if (!validStatuses.includes(readingStatus)) {
      return NextResponse.json(
        { error: "Invalid reading status" },
        { status: 400 }
      );
    }

    const updatedSavedNovel = await db.savedNovel.update({
      where: {
        userId_novelId: { userId: session.user.id, novelId },
      },
      data: {
        readingStatus,
      },
      include: {
        novel: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
          },
        },
      },
    });

    return NextResponse.json(updatedSavedNovel);
  } catch (error) {
    console.error("Failed to update reading status:", error);
    return NextResponse.json(
      { error: "Failed to update reading status" },
      { status: 500 }
    );
  }
}
