import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNovelViewCounts } from "@/lib/views";
import { auth } from "@/lib/auth";
import { decode } from "@auth/core/jwt";

const SESSION_COOKIE_NAME = "authjs.session-token";

export const dynamic = "force-dynamic";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const userId = await getUserIdFromRequest(request);

    const novel = await db.webnovel.findUnique({
      where: { slug },
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
        scheduledChapters: {
          orderBy: { chapterNumber: "asc" },
          select: {
            id: true,
            chapterNumber: true,
            title: true,
            scheduledFor: true,
          },
        },
      },
    });

    if (!novel) {
      return NextResponse.json(
        { error: "Зохиол олдсонгүй" },
        { status: 404 }
      );
    }

    // Hidden novels are only visible to owner, admin, or moderator
    const session = await auth();
    const isOwner = novel.publisherId === session?.user?.id;
    const isStaff = session?.user?.role === "admin" || session?.user?.role === "moderator";
    if (novel.hidden && !isOwner && !isStaff) {
      return NextResponse.json(
        { error: "Зохиол олдсонгүй" },
        { status: 404 }
      );
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
    const allViews = regularChapterViews + volumeChapterViews;

    const reviews = await db.review.findMany({
      where: { novelId: novel.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
        likes: userId
          ? {
              where: { userId: userId },
              select: { type: true },
            }
          : false,
      },
    });

    const totalReviews = await db.review.count({
      where: { novelId: novel.id },
    });

    const averageRating =
      totalReviews > 0
        ? (
            await db.review.aggregate({
              where: { novelId: novel.id },
              _avg: { rating: true },
            })
          )._avg.rating || 0
        : 0;

    const isSaved = userId
      ? !!(await db.savedNovel.findUnique({
          where: {
            userId_novelId: {
              userId: userId,
              novelId: novel.id,
            },
          },
        }))
      : false;

    const savedNovel = isSaved && userId
      ? await db.savedNovel.findUnique({
          where: {
            userId_novelId: {
              userId: userId,
              novelId: novel.id,
            },
          },
          select: { readingStatus: true },
        })
      : null;

    let readingProgress = null;
    if (userId) {
      const progress = await db.readingProgress.findUnique({
        where: {
          userId_novelId: {
            userId: userId,
            novelId: novel.id,
          },
        },
      });
      if (progress) {
        readingProgress = {
          chapterNumber: progress.chapterNumber,
          isVolumeChapter: progress.isVolumeChapter,
          volumeId: progress.volumeId,
        };
      }
    }

    const formattedReviews = reviews.map((review) => ({
      ...review,
      userLike: (review.likes as any)?.[0] || null,
    }));

    const result = {
      ...novel,
      totalViews: allViews,
      saved: isSaved,
      readingStatus: savedNovel?.readingStatus || null,
      readingProgress,
      reviews: formattedReviews,
      totalReviews,
      averageRating,
      volumes: novel.volumes.map((v) => ({
        id: v.id,
        volumeNumber: v.volumeNumber,
        title: v.title,
        thumbnail: v.thumbnail,
        chapters: v.chapters,
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching novel:", error);
    return NextResponse.json(
      { error: "Зохиол татахад алдаа гарлаа" },
      { status: 500 }
    );
  }
}