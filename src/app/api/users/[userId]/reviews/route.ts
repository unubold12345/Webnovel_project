import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 10;
    const offset = (page - 1) * limit;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [reviews, totalCount] = await Promise.all([
      db.review.findMany({
        where: { userId },
        include: {
          novel: {
            select: {
              id: true,
              slug: true,
              title: true,
              thumbnail: true,
            },
          },
          likes: session?.user?.id
            ? {
                where: { userId: session.user.id },
                select: { type: true },
              }
            : false,
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      db.review.count({
        where: { userId },
      }),
    ]);

    const processedReviews = reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      content: review.content,
      isSpoiler: review.isSpoiler,
      likeCount: review.likeCount,
      dislikeCount: review.dislikeCount,
      createdAt: review.createdAt,
      novel: review.novel,
      userLike: review.likes?.[0] || null,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      reviews: processedReviews,
      totalPages,
      currentPage: page,
      totalCount,
      userRole: user.role,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
