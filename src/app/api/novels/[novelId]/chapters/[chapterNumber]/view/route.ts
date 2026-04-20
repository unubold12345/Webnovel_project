import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string; chapterNumber: string }> }
) {
  try {
    const { novelId, chapterNumber } = await params;

    const chapter = await db.chapter.update({
      where: {
        novelId_chapterNumber: {
          novelId,
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
    return NextResponse.json(
      { error: "Failed to increment view count" },
      { status: 500 }
    );
  }
}