import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "admin" && session.user.role !== "moderator")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { novelId } = await params;
    const data = await req.json();

    // Convert chapterNumber to integer
    const chapterNumber = parseInt(data.chapterNumber, 10);

    const existingChapter = await db.chapter.findUnique({
      where: {
        novelId_chapterNumber: {
          novelId,
          chapterNumber,
        },
      },
    });

    if (existingChapter) {
      return NextResponse.json(
        { error: "Chapter number already exists" },
        { status: 400 }
      );
    }

    // Try to delete scheduled chapter if exists
    try {
      await db.scheduledChapter.delete({
        where: {
          novelId_chapterNumber: {
            novelId,
            chapterNumber,
          },
        },
      });
    } catch {
      // Ignore if scheduled chapter doesn't exist
    }

    // Create the chapter
    const chapter = await db.chapter.create({
      data: {
        novelId,
        chapterNumber,
        title: data.title,
        content: data.content,
      },
    });

    return NextResponse.json(chapter);
  } catch (error) {
    console.error("Error creating chapter:", error);
    return NextResponse.json(
      { error: "Failed to create chapter" },
      { status: 500 }
    );
  }
}
