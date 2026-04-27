import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decode } from "@auth/core/jwt";

const SESSION_COOKIE_NAME = "authjs.session-token";

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  // First try NextAuth session
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }

  // Then try mobile Bearer token
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (token) {
    try {
      const decoded = await decode({
        token,
        secret: process.env.AUTH_SECRET!,
        salt: SESSION_COOKIE_NAME,
      });

      if (decoded?.sub) {
        return decoded.sub as string;
      }
    } catch {
      // Invalid token
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const isAdminOrMod = session?.user?.role === "admin" || session?.user?.role === "moderator";
    const { searchParams } = new URL(req.url);
    const novelId = searchParams.get("novelId");
    const chapterId = searchParams.get("chapterId");
    const volumeId = searchParams.get("volumeId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 10;
    const offset = (page - 1) * limit;

    const [rootCommentsForPagination, allComments, totalCount, novelData] = await Promise.all([
      db.comment.findMany({
        where: {
          novelId: novelId || null,
          chapterId: chapterId || null,
          volumeId: volumeId || null,
          parentId: null,
        },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip: offset,
        take: limit,
        select: { id: true, deletedAt: true, isPinned: true },
      }),
      db.comment.findMany({
        where: {
          novelId: novelId || null,
          chapterId: chapterId || null,
          volumeId: volumeId || null,
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
          parent: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: [{ isPinned: "desc" }, { createdAt: "asc" }],
      }),
      db.comment.count({
        where: {
          novelId: novelId || null,
          chapterId: chapterId || null,
          volumeId: volumeId || null,
          parentId: null,
        },
      }),
      novelId
        ? db.webnovel.findUnique({
            where: { id: novelId },
            select: { publisherId: true },
          })
        : Promise.resolve(null),
    ]);

    const rootCommentIds = new Set(rootCommentsForPagination.map(c => c.id));
    const totalPages = Math.ceil(totalCount / limit);

    interface CommentWithReplies {
      id: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
      userId: string;
      novelId: string | null;
      chapterId: string | null;
      volumeId: string | null;
      parentId: string | null;
      likeCount: number;
      dislikeCount: number;
      deletedAt: Date | null;
      deletedReason: string | null;
      deletedByOwner: boolean;
      recoverableUntil: Date | null;
      isPinned: boolean;
      user: { id: string; username: string; avatar: string | null; role: string };
      parent: { user: { id: string; username: string; role: string } } | null;
      replies: CommentWithReplies[];
      depth: number;
    }

    const commentMap = new Map<string, CommentWithReplies>();
    const rootComments: CommentWithReplies[] = [];

    const getDepth = (commentId: string | null, visited: Set<string> = new Set()): number => {
      if (!commentId || visited.has(commentId)) return 0;
      visited.add(commentId);
      const comment = commentMap.get(commentId);
      if (!comment) return 0;
      if (comment.depth > 0) return comment.depth;
      const parentDepth = getDepth(comment.parentId, visited);
      comment.depth = parentDepth + 1;
      return comment.depth;
    };

    allComments.forEach((comment) => {
      let displayContent = comment.content;
      if (comment.deletedAt && !isAdminOrMod) {
        displayContent = comment.deletedByOwner ? "Comment deleted" : "Removed by moderator";
      }
      const processedComment: CommentWithReplies = {
        ...comment,
        replies: [],
        depth: 0,
        content: displayContent,
      };
      commentMap.set(comment.id, processedComment);
    });

    allComments.forEach((comment) => {
      getDepth(comment.id);
    });

    const findLevel1Ancestor = (commentId: string | null): CommentWithReplies | null => {
      if (!commentId) return null;
      const comment = commentMap.get(commentId);
      if (!comment) return null;
      if (comment.depth === 1) return comment;
      return findLevel1Ancestor(comment.parentId);
    };

    allComments.forEach((comment) => {
      const depth = commentMap.get(comment.id)!.depth;
      if (comment.parentId && commentMap.has(comment.parentId)) {
        if (depth < 2) {
          const parent = commentMap.get(comment.parentId)!;
          parent.replies.push(commentMap.get(comment.id)!);
        } else {
          const level1Ancestor = findLevel1Ancestor(comment.parentId);
          if (level1Ancestor) {
            level1Ancestor.replies.push(commentMap.get(comment.id)!);
          }
        }
      } else if (!comment.parentId && rootCommentIds.has(comment.id)) {
        rootComments.push(commentMap.get(comment.id)!);
      }
    });

    const sortReplies = (comment: CommentWithReplies): CommentWithReplies => {
      return {
        ...comment,
        replies: comment.replies
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map(sortReplies),
      };
    };

    const sortedRootComments = rootComments.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const sortedCommentsWithReplies = sortedRootComments.map(sortReplies);

    return NextResponse.json({
      comments: sortedCommentsWithReplies,
      totalPages,
      currentPage: page,
      totalCount,
      isAdmin: isAdminOrMod,
      publisherId: novelData?.publisherId || null,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { novelId, chapterId, volumeId, content, parentId, isSpoiler, isPinned } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "Content required" }, { status: 400 });
    }

    // Fetch user role for admin/moderator check
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isAdminOrMod = user?.role === "admin" || user?.role === "moderator";

    let parentComment = null;
    if (parentId) {
      parentComment = await db.comment.findUnique({
        where: { id: parentId },
        include: {
          novel: true,
          chapter: true,
          volume: true,
        },
      });
      if (!parentComment) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }
    }

    const comment = await db.comment.create({
      data: {
        userId: userId,
        novelId: novelId || null,
        chapterId: chapterId || null,
        volumeId: volumeId || null,
        parentId: parentId || null,
        content,
        isSpoiler: isSpoiler || false,
        isPinned: isAdminOrMod && isPinned === true ? true : false,
      },
      include: {
        user: {
          select: {
            username: true,
            avatar: true,
            role: true,
          },
        },
        novel: true,
        chapter: true,
        volume: true,
      },
    });

    if (parentComment && parentComment.userId !== userId) {
      const replier = await db.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });

      let link: string | null = null;
      
      if (comment.novel?.slug) {
        if (comment.chapter) {
          link = `/novels/${comment.novel.slug}/chapters/${comment.chapter.chapterNumber}#comment-${comment.id}`;
        } else if (comment.volume) {
          link = `/novels/${comment.novel.slug}/volumes/${comment.volume.volumeNumber}#comment-${comment.id}`;
        } else {
          link = `/novels/${comment.novel.slug}#comment-${comment.id}`;
        }
      }

      if (link) {
        await db.notification.create({
          data: {
            userId: parentComment.userId,
            type: "comment_reply",
            message: `${replier?.username || "Хэн нэгэн"} таны сэтгэгдэлд хариу бичлээ`,
            link,
          },
        });
      }
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
