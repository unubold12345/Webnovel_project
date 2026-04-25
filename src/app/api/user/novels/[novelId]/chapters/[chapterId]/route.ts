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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string; chapterId: string }> }
) {
  try {
    const session = await auth();
    const { novelId, chapterId } = await params;

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isOwner = await verifyOwnership(session, novelId);
    if (!isOwner && session.user.role !== "admin" && session.user.role !== "moderator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
  { params }: { params: Promise<{ novelId: string; chapterId: string }> }
) {
  try {
    const session = await auth();
    const { novelId, chapterId } = await params;

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isOwner = await verifyOwnership(session, novelId);
    if (!isOwner && session.user.role !== "admin" && session.user.role !== "moderator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
