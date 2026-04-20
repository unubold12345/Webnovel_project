import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 10;
    const offset = (page - 1) * limit;

    const [comments, totalCount] = await Promise.all([
      db.comment.findMany({
        where: { userId: session.user.id },
        include: {
          novel: {
            select: {
              id: true,
              slug: true,
              title: true,
            },
          },
          chapter: {
            select: {
              id: true,
              chapterNumber: true,
              title: true,
            },
          },
          parent: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      db.comment.count({
        where: { userId: session.user.id },
      }),
    ]);

    const processedComments = comments.map((comment) => {
      const isDeleted = !!comment.deletedAt;
      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        likeCount: comment.likeCount,
        dislikeCount: comment.dislikeCount,
        deletedAt: comment.deletedAt,
        deletedReason: comment.deletedReason,
        showRemovedBadge: isDeleted,
        novel: comment.novel,
        chapter: comment.chapter,
        parent: comment.parent,
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      comments: processedComments,
      totalPages,
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}