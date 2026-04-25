import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getVolumeRemainingCost } from "@/lib/volume-remaining-cost";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, id } = body as {
      type: "chapter" | "volumeChapter" | "volume";
      id: string;
    };

    if (!type || !id) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Check if already unlocked
    if (type === "chapter") {
      const existing = await db.unlockedChapter.findUnique({
        where: { userId_chapterId: { userId, chapterId: id } },
      });
      if (existing) {
        return NextResponse.json({ success: true, alreadyUnlocked: true });
      }
    } else if (type === "volumeChapter") {
      const existing = await db.unlockedChapter.findUnique({
        where: { userId_volumeChapterId: { userId, volumeChapterId: id } },
      });
      if (existing) {
        return NextResponse.json({ success: true, alreadyUnlocked: true });
      }
      // Also check if parent volume is unlocked
      const chapter = await db.volumeChapter.findUnique({
        where: { id },
        select: { volumeId: true },
      });
      if (chapter) {
        const volumeUnlocked = await db.unlockedVolume.findUnique({
          where: { userId_volumeId: { userId, volumeId: chapter.volumeId } },
        });
        if (volumeUnlocked) {
          return NextResponse.json({ success: true, alreadyUnlocked: true });
        }
      }
    } else if (type === "volume") {
      const existing = await db.unlockedVolume.findUnique({
        where: { userId_volumeId: { userId, volumeId: id } },
      });
      if (existing) {
        return NextResponse.json({ success: true, alreadyUnlocked: true });
      }
    }

    // Get chapter info and check cost
    let coinCost = 0;
    let novelId: string | null = null;
    let chapterTitle = "";
    let chapterNumber: number | null = null;
    let novelTitle = "";

    let actualUnlockType: "chapter" | "volumeChapter" | "volume" = type;
    let actualUnlockId = id;

    if (type === "chapter") {
      const chapter = await db.chapter.findUnique({
        where: { id },
        select: { isPaid: true, coinCost: true, novelId: true, title: true, chapterNumber: true },
      });
      if (!chapter) {
        return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
      }
      if (!chapter.isPaid) {
        return NextResponse.json({ success: true, free: true });
      }
      coinCost = chapter.coinCost;
      novelId = chapter.novelId;
      chapterTitle = chapter.title;
      chapterNumber = chapter.chapterNumber;
    } else if (type === "volumeChapter") {
      const chapter = await db.volumeChapter.findUnique({
        where: { id },
        select: { isPaid: true, coinCost: true, volumeId: true, title: true, chapterNumber: true },
      });
      if (!chapter) {
        return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
      }
      // Check if parent volume is paid/unlocked
      const volume = await db.volume.findUnique({
        where: { id: chapter.volumeId },
        select: { isPaid: true, coinCost: true, novelId: true },
      });
      if (volume?.isPaid) {
        // If volume is paid, unlock the volume instead of the chapter
        actualUnlockType = "volume";
        actualUnlockId = chapter.volumeId;
        coinCost = await getVolumeRemainingCost(userId, chapter.volumeId, volume.coinCost);
        novelId = volume.novelId;
        chapterTitle = `Боть тайлах`;
        chapterNumber = null;
      } else {
        if (!chapter.isPaid) {
          return NextResponse.json({ success: true, free: true });
        }
        coinCost = chapter.coinCost;
        chapterTitle = chapter.title;
        chapterNumber = chapter.chapterNumber;
        novelId = volume?.novelId ?? null;
      }
    } else if (type === "volume") {
      const volume = await db.volume.findUnique({
        where: { id },
        select: { isPaid: true, coinCost: true, novelId: true, title: true, volumeNumber: true },
      });
      if (!volume) {
        return NextResponse.json({ error: "Volume not found" }, { status: 404 });
      }
      if (!volume.isPaid) {
        return NextResponse.json({ success: true, free: true });
      }
      coinCost = await getVolumeRemainingCost(userId, id, volume.coinCost);
      novelId = volume.novelId;
      chapterTitle = volume.title;
      chapterNumber = volume.volumeNumber;
    }

    if (novelId) {
      const novel = await db.webnovel.findUnique({
        where: { id: novelId },
        select: { title: true },
      });
      novelTitle = novel?.title ?? "";
    }

    // Check user coins
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });

    if (!user || user.coins < coinCost) {
      return NextResponse.json(
        { error: "Insufficient coins", required: coinCost, current: user?.coins ?? 0 },
        { status: 402 }
      );
    }

    // Deduct coins and create unlock record
    const updatedUser = await db.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { coins: { decrement: coinCost } },
      });

      if (actualUnlockType === "chapter") {
        await tx.unlockedChapter.create({
          data: { userId, chapterId: actualUnlockId },
        });
      } else if (actualUnlockType === "volumeChapter") {
        await tx.unlockedChapter.create({
          data: { userId, volumeChapterId: actualUnlockId },
        });
      } else if (actualUnlockType === "volume") {
        await tx.unlockedVolume.create({
          data: { userId, volumeId: actualUnlockId },
        });
      }

      return user;
    });

    await db.coinHistory.create({
      data: {
        userId,
        amount: -coinCost,
        balance: updatedUser.coins,
        type: "unlock",
        description: type === "volume"
          ? `${novelTitle} - Боть ${chapterNumber}${chapterTitle ? `: ${chapterTitle}` : ""} тайлсан`
          : `${novelTitle} - Бүлэг ${chapterNumber}${chapterTitle ? `: ${chapterTitle}` : ""} тайлсан`,
        novelId,
        chapterId: actualUnlockType === "chapter" ? actualUnlockId : null,
        volumeChapterId: actualUnlockType === "volumeChapter" ? actualUnlockId : null,
      },
    });

    return NextResponse.json({ success: true, coinCost });
  } catch (error) {
    console.error("Error unlocking chapter:", error);
    return NextResponse.json(
      { error: "Failed to unlock chapter" },
      { status: 500 }
    );
  }
}
