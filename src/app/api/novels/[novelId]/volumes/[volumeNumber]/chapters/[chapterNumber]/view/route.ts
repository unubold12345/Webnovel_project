import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string; volumeNumber: string; chapterNumber: string }> }
) {
  try {
    const { novelId, volumeNumber, chapterNumber } = await params;

    // First, find the volume
    const volume = await db.volume.findUnique({
      where: {
        novelId_volumeNumber: {
          novelId,
          volumeNumber: parseInt(volumeNumber),
        },
      },
    });

    if (!volume) {
      return NextResponse.json(
        { error: "Volume not found" },
        { status: 404 }
      );
    }

    // Then, update the view count for the volume chapter
    const chapter = await db.volumeChapter.update({
      where: {
        volumeId_chapterNumber: {
          volumeId: volume.id,
          chapterNumber: parseInt(chapterNumber),
        },
      },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({ viewCount: chapter.viewCount });
  } catch (error) {
    console.error("Error incrementing view count:", error);
    return NextResponse.json(
      { error: "Failed to increment view count" },
      { status: 500 }
    );
  }
}
