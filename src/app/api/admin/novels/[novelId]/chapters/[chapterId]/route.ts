import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ novelId: string; chapterId: string }>;
  }
) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "admin" && session.user.role !== "moderator")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chapterId } = await params;
    const data = await req.json();

    const chapter = await db.chapter.update({
      where: { id: chapterId },
      data: {
        chapterNumber: data.chapterNumber,
        title: data.title,
        content: data.content,
      },
    });

    return NextResponse.json(chapter);
  } catch (error) {
    console.error("Error updating chapter:", error);
    return NextResponse.json(
      { error: "Failed to update chapter" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ novelId: string; chapterId: string }>;
  }
) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "admin" && session.user.role !== "moderator")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { novelId, chapterId } = await params;

    // Delete the chapter and update totalChapters in a transaction
    await db.$transaction([
      db.chapter.delete({
        where: { id: chapterId },
      }),
      db.webnovel.update({
        where: { id: novelId },
        data: {
          totalChapters: {
            decrement: 1,
          },
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chapter:", error);
    return NextResponse.json(
      { error: "Failed to delete chapter" },
      { status: 500 }
    );
  }
}
