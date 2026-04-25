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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string }> }
) {
  try {
    const session = await auth();
    const { novelId } = await params;

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const novel = await db.webnovel.findUnique({
      where: { id: novelId },
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
    });

    if (!novel) {
      return NextResponse.json({ error: "Novel not found" }, { status: 404 });
    }

    if (novel.publisherId !== session.user.id && session.user.role !== "admin" && session.user.role !== "moderator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(novel);
  } catch (error) {
    console.error("Error fetching novel:", error);
    return NextResponse.json(
      { error: "Failed to fetch novel" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    // Users cannot change to light_novel
    if (data.novelType === "light_novel" && !(session.user.role === "admin" || session.user.role === "moderator")) {
      return NextResponse.json(
        { error: "Users can only publish webnovels" },
        { status: 403 }
      );
    }

    const novel = await db.webnovel.update({
      where: { id: novelId },
      data: {
        title: data.title,
        slug: data.slug,
        author: data.author,
        translator: data.translator || null,
        summary: data.summary,
        thumbnail: data.thumbnail,
        genres: data.genres || null,
        status: data.status,
        translationStatus: data.translationStatus,
        totalChapters: Number(data.totalChapters) || 0,
      },
    });

    return NextResponse.json(novel);
  } catch (error) {
    console.error("Error updating novel:", error);
    return NextResponse.json(
      { error: "Failed to update novel" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const { hidden } = await req.json();
    if (typeof hidden !== "boolean") {
      return NextResponse.json({ error: "Invalid hidden value" }, { status: 400 });
    }

    const novel = await db.webnovel.update({
      where: { id: novelId },
      data: { hidden },
    });

    return NextResponse.json(novel);
  } catch (error) {
    console.error("Error updating novel visibility:", error);
    return NextResponse.json(
      { error: "Failed to update novel visibility" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string }> }
) {
  try {
    const session = await auth();
    const { novelId } = await params;

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and moderators can delete novels
    if (session.user.role !== "admin" && session.user.role !== "moderator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.webnovel.delete({
      where: { id: novelId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting novel:", error);
    return NextResponse.json(
      { error: "Failed to delete novel" },
      { status: 500 }
    );
  }
}
