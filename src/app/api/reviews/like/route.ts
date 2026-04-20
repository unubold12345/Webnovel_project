import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reviewId, type } = await req.json();

    if (!reviewId || !type || (type !== "like" && type !== "dislike")) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Check if review exists
    const review = await db.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Check if user has already liked/disliked this review
    const existingLike = await db.reviewLike.findUnique({
      where: {
        userId_reviewId: {
          userId: session.user.id,
          reviewId: reviewId,
        },
      },
    });

    if (existingLike) {
      if (existingLike.type === type) {
        // Remove like/dislike if clicking the same type
        await db.reviewLike.delete({
          where: { id: existingLike.id },
        });

        // Update review counts
        if (type === "like") {
          await db.review.update({
            where: { id: reviewId },
            data: { likeCount: { decrement: 1 } },
          });
        } else {
          await db.review.update({
            where: { id: reviewId },
            data: { dislikeCount: { decrement: 1 } },
          });
        }

        return NextResponse.json({ removed: true });
      } else {
        // Change from like to dislike or vice versa
        await db.reviewLike.update({
          where: { id: existingLike.id },
          data: { type },
        });

        // Update review counts
        if (type === "like") {
          await db.review.update({
            where: { id: reviewId },
            data: {
              likeCount: { increment: 1 },
              dislikeCount: { decrement: 1 },
            },
          });
        } else {
          await db.review.update({
            where: { id: reviewId },
            data: {
              likeCount: { decrement: 1 },
              dislikeCount: { increment: 1 },
            },
          });
        }

        return NextResponse.json({ updated: true });
      }
    }

    // Create new like/dislike
    await db.reviewLike.create({
      data: {
        userId: session.user.id,
        reviewId: reviewId,
        type: type,
      },
    });

    // Update review counts
    if (type === "like") {
      await db.review.update({
        where: { id: reviewId },
        data: { likeCount: { increment: 1 } },
      });
    } else {
      await db.review.update({
        where: { id: reviewId },
        data: { dislikeCount: { increment: 1 } },
      });
    }

    return NextResponse.json({ created: true });
  } catch (error) {
    console.error("Error liking review:", error);
    return NextResponse.json(
      { error: "Failed to like review" },
      { status: 500 }
    );
  }
}
