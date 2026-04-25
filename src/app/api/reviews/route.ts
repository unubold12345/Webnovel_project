import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const novelId = searchParams.get("novelId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const session = await auth();

    if (!novelId) {
      return NextResponse.json(
        { error: "novelId is required" },
        { status: 400 }
      );
    }

    const where = { novelId };

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              role: true,
            },
          },
          likes: session?.user?.id
            ? {
                where: { userId: session.user.id },
                select: { type: true },
              }
            : false,
        },
      }),
      db.review.count({ where }),
    ]);

    const formattedReviews = reviews.map((review) => ({
      ...review,
      userLike: (review.likes as any)?.[0] || null,
    }));

    return NextResponse.json({
      reviews: formattedReviews,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalCount: total,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { novelId, rating, content, isSpoiler } = await req.json();

    // Validation
    if (!novelId) {
      return NextResponse.json({ error: "Novel ID is required" }, { status: 400 });
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Review content is required" }, { status: 400 });
    }

    // Check if user has already reviewed this novel
    const existingReview = await db.review.findUnique({
      where: {
        userId_novelId: {
          userId: session.user.id,
          novelId: novelId,
        },
      },
    });

    if (existingReview) {
      return NextResponse.json({ error: "You have already reviewed this novel" }, { status: 400 });
    }

    // Create the review
    const review = await db.review.create({
      data: {
        userId: session.user.id,
        novelId: novelId,
        rating: rating,
        content: content,
        isSpoiler: isSpoiler || false,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}
