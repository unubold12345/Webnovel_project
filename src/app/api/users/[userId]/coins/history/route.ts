import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const session = await auth();

    // Allow users to view their own, or staff to view any user's coin history
    const isStaff = session?.user?.role === "admin" || session?.user?.role === "moderator";
    if (!session?.user?.id || (session.user.id !== userId && !isStaff)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      db.coinHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          novel: { select: { id: true, title: true, slug: true } },
          chapter: { select: { id: true, chapterNumber: true, title: true } },
          volumeChapter: { select: { id: true, chapterNumber: true, title: true } },
        },
      }),
      db.coinHistory.count({
        where: { userId },
      }),
    ]);

    return NextResponse.json({
      history,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching coin history:", error);
    return NextResponse.json(
      { error: "Failed to fetch coin history" },
      { status: 500 }
    );
  }
}
