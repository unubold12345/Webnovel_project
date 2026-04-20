import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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
