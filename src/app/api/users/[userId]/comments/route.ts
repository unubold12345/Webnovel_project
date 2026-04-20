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
    console.log("Session in API:", JSON.stringify(session?.user));
    const isOwner = !!session?.user?.id && session?.user?.id === userId;
    console.log("isOwner calculated:", isOwner, "session.user.id:", session?.user?.id, "userId:", userId);
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

    const [comments, totalCount] = await Promise.all([
      db.comment.findMany({
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
          chapter: {
            select: {
              id: true,
              chapterNumber: true,
              title: true,
            },
          },
          parent: {
            select: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
              content: true,
              deletedAt: true,
              deletedReason: true,
              isSpoiler: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      db.comment.count({
        where: { userId },
      }),
    ]);

    const processedComments = comments.map((comment) => {
      const isDeleted = !!comment.deletedAt;
      const isAdminOrMod = session?.user?.role === "admin" || session?.user?.role === "moderator";
      if (isDeleted && isOwner) {
        return {
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          likeCount: comment.likeCount,
          dislikeCount: comment.dislikeCount,
          deletedAt: comment.deletedAt,
          deletedReason: comment.deletedReason,
          isSpoiler: comment.isSpoiler,
          showRemovedBadge: true,
          novel: comment.novel,
          chapter: comment.chapter,
          parent: comment.parent ? {
            ...comment.parent,
            isSpoiler: comment.parent.isSpoiler,
          } : null,
        };
      }
      if (isDeleted && !isOwner && !isAdminOrMod) {
        return {
          id: comment.id,
          content: "",
          createdAt: comment.createdAt,
          likeCount: comment.likeCount,
          dislikeCount: comment.dislikeCount,
          deletedAt: comment.deletedAt,
          deletedReason: comment.deletedReason,
          isSpoiler: comment.isSpoiler,
          showRemovedBadge: true,
          novel: comment.novel,
          chapter: comment.chapter,
          parent: comment.parent ? {
            ...comment.parent,
            isSpoiler: comment.parent.isSpoiler,
          } : null,
        };
      }
      if (isDeleted && (isOwner || isAdminOrMod)) {
        return {
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          likeCount: comment.likeCount,
          dislikeCount: comment.dislikeCount,
          deletedAt: comment.deletedAt,
          deletedReason: comment.deletedReason,
          isSpoiler: comment.isSpoiler,
          showRemovedBadge: isOwner,
          novel: comment.novel,
          chapter: comment.chapter,
          parent: comment.parent ? {
            ...comment.parent,
            isSpoiler: comment.parent.isSpoiler,
          } : null,
        };
      }
      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        likeCount: comment.likeCount,
        dislikeCount: comment.dislikeCount,
        deletedAt: null,
        deletedReason: null,
        isSpoiler: comment.isSpoiler,
        showRemovedBadge: false,
        novel: comment.novel,
        chapter: comment.chapter,
        parent: comment.parent ? {
          ...comment.parent,
          isSpoiler: comment.parent.isSpoiler,
        } : null,
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      comments: processedComments,
      totalPages,
      currentPage: page,
      totalCount,
      userRole: user.role,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}