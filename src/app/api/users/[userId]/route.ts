import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        password: true,
        _count: {
          select: {
            comments: true,
            reviews: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [commentLikes, commentDislikes, reviewLikes, reviewDislikes] = await Promise.all([
      db.commentLike.count({
        where: {
          comment: { userId },
          type: "like",
        },
      }),
      db.commentLike.count({
        where: {
          comment: { userId },
          type: "dislike",
        },
      }),
      db.reviewLike.count({
        where: {
          review: { userId },
          type: "like",
        },
      }),
      db.reviewLike.count({
        where: {
          review: { userId },
          type: "dislike",
        },
      }),
    ]);

    const hasPassword = user.password && user.password.length > 0;

    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      needsPassword: !hasPassword,
      stats: {
        comments: {
          count: user._count.comments,
          likes: commentLikes,
          dislikes: commentDislikes,
        },
        reviews: {
          count: user._count.reviews,
          likes: reviewLikes,
          dislikes: reviewDislikes,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}