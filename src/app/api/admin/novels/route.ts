import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "admin" && session.user.role !== "moderator")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    const novel = await db.webnovel.create({
      data: {
        title: data.title,
        slug: data.slug,
        author: data.author,
        translator: data.translator || null,
        summary: data.summary,
        thumbnail: data.thumbnail,
        novelType: data.novelType || "webnovel",
        status: data.status,
        translationStatus: data.translationStatus || "ongoing",
        totalChapters: data.novelType === "light_novel" ? 0 : (data.totalChapters || 0),
        totalVolumes: data.novelType === "light_novel" ? (data.totalVolumes || 0) : 0,
      },
    });

    return NextResponse.json(novel);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create novel" },
      { status: 500 }
    );
  }
}