import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

async function verifyOwnership(session: any, novelId: string) {
  if (!session || !session.user?.id) return false;
  const novel = await db.webnovel.findUnique({
    where: { id: novelId },
    select: { publisherId: true },
  });
  return novel?.publisherId === session.user.id;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string }> }
) {
  try {
    const session = await auth();
    const { novelId } = await params;

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isOwner = await verifyOwnership(session, novelId);
    if (!isOwner && session.user.role !== "admin" && session.user.role !== "moderator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await req.json();
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
