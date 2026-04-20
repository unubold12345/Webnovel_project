import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PUT(
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

    const novel = await db.webnovel.update({
      where: { id: novelId },
      data: {
        title: data.title,
        slug: data.slug,
        author: data.author,
        translator: data.translator || null,
        summary: data.summary,
        thumbnail: data.thumbnail,
        novelType: data.novelType,
        status: data.status,
        translationStatus: data.translationStatus,
        totalChapters: data.novelType === "light_novel" ? 0 : (Number(data.totalChapters) || 0),
        totalVolumes: data.novelType === "light_novel" ? (Number(data.totalVolumes) || 0) : 0,
      },
    });

    return NextResponse.json(novel);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update novel" },
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
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 401 });
    }

    const { novelId } = await params;

    await db.webnovel.delete({
      where: { id: novelId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete novel" },
      { status: 500 }
    );
  }
}