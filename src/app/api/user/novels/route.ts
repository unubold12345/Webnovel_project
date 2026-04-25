import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const novels = await db.webnovel.findMany({
      where: { publisherId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        author: true,
        novelType: true,
        status: true,
        hidden: true,
        hiddenReason: true,
        totalChapters: true,
        totalVolumes: true,
        _count: {
          select: { chapters: true, volumes: true },
        },
      },
    });

    return NextResponse.json(novels);
  } catch (error) {
    console.error("Error fetching user novels:", error);
    return NextResponse.json(
      { error: "Failed to fetch novels" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.acceptedTermsAt) {
      return NextResponse.json(
        { error: "You must accept the terms and conditions before publishing" },
        { status: 403 }
      );
    }

    const data = await req.json();

    // Users can only create webnovels
    if (data.novelType === "light_novel") {
      return NextResponse.json(
        { error: "Users can only publish webnovels" },
        { status: 403 }
      );
    }

    const novel = await db.webnovel.create({
      data: {
        title: data.title,
        slug: data.slug,
        author: data.author,
        translator: data.translator || null,
        summary: data.summary,
        thumbnail: data.thumbnail,
        genres: data.genres || null,
        novelType: "webnovel",
        status: data.status,
        translationStatus: data.translationStatus || "ongoing",
        totalChapters: data.totalChapters || 0,
        totalVolumes: 0,
        publisherId: session.user.id,
      },
    });

    return NextResponse.json(novel);
  } catch (error) {
    console.error("Error creating novel:", error);
    return NextResponse.json(
      { error: "Failed to create novel" },
      { status: 500 }
    );
  }
}
