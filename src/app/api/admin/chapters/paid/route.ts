import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const novelId = searchParams.get("novelId");

    if (!novelId) {
      // Return all novels with basic info
      const novels = await db.webnovel.findMany({
        select: {
          id: true,
          title: true,
          slug: true,
          totalChapters: true,
          totalVolumes: true,
        },
        orderBy: { title: "asc" },
      });
      return NextResponse.json({ novels });
    }

    // Return chapters for a specific novel
    const [chapters, volumes] = await Promise.all([
      db.chapter.findMany({
        where: { novelId },
        select: {
          id: true,
          chapterNumber: true,
          title: true,
          isPaid: true,
          coinCost: true,
          viewCount: true,
          createdAt: true,
        },
        orderBy: { chapterNumber: "asc" },
      }),
      db.volume.findMany({
        where: { novelId },
        select: {
          id: true,
          volumeNumber: true,
          title: true,
          isPaid: true,
          coinCost: true,
          chapters: {
            select: {
              id: true,
              chapterNumber: true,
              title: true,
              isPaid: true,
              coinCost: true,
              viewCount: true,
              createdAt: true,
            },
            orderBy: { chapterNumber: "asc" },
          },
        },
        orderBy: { volumeNumber: "asc" },
      }),
    ]);

    return NextResponse.json({ chapters, volumes });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch chapters" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { updates } = body as {
      updates: Array<{
        type: "chapter" | "volumeChapter" | "volume";
        id: string;
        isPaid: boolean;
        coinCost: number;
      }>;
    };

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 }
      );
    }

    const chapterUpdates = updates.filter((u) => u.type === "chapter");
    const volumeChapterUpdates = updates.filter(
      (u) => u.type === "volumeChapter"
    );
    const volumeUpdates = updates.filter((u) => u.type === "volume");

    await db.$transaction(async (tx) => {
      for (const update of chapterUpdates) {
        await tx.chapter.update({
          where: { id: update.id },
          data: {
            isPaid: update.isPaid,
            coinCost: update.coinCost,
          },
        });
      }

      for (const update of volumeChapterUpdates) {
        await tx.volumeChapter.update({
          where: { id: update.id },
          data: {
            isPaid: update.isPaid,
            coinCost: update.coinCost,
          },
        });
      }

      for (const update of volumeUpdates) {
        await tx.volume.update({
          where: { id: update.id },
          data: {
            isPaid: update.isPaid,
            coinCost: update.coinCost,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update chapters" },
      { status: 500 }
    );
  }
}
