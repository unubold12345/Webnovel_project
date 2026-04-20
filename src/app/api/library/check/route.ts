import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ isSaved: false });
    }

    const { searchParams } = new URL(req.url);
    const novelId = searchParams.get("novelId");

    if (!novelId) {
      return NextResponse.json({ error: "Novel ID is required" }, { status: 400 });
    }

    const savedNovel = await db.savedNovel.findUnique({
      where: {
        userId_novelId: { userId: session.user.id, novelId },
      },
    });

    return NextResponse.json({
      isSaved: !!savedNovel,
      readingStatus: savedNovel?.readingStatus || null,
    });
  } catch (error) {
    console.error("Failed to check saved status:", error);
    return NextResponse.json({ error: "Failed to check saved status" }, { status: 500 });
  }
}
