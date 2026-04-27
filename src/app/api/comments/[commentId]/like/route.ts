import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decode } from "@auth/core/jwt";

const SESSION_COOKIE_NAME = "authjs.session-token";

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }

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

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId, type } = await req.json();

    if (!commentId || !type || !["like", "dislike"].includes(type)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: {
        novel: true,
        chapter: true,
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const existingLike = await db.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId: userId,
          commentId,
        },
      },
    });

    if (existingLike) {
      if (existingLike.type === type) {
        await db.commentLike.delete({
          where: { id: existingLike.id },
        });

        if (type === "like") {
          await db.comment.update({
            where: { id: commentId },
            data: { likeCount: { decrement: 1 } },
          });
        } else {
          await db.comment.update({
            where: { id: commentId },
            data: { dislikeCount: { decrement: 1 } },
          });
        }
      } else {
        await db.commentLike.update({
          where: { id: existingLike.id },
          data: { type },
        });

        if (type === "like") {
          await db.comment.update({
            where: { id: commentId },
            data: { 
              likeCount: { increment: 1 },
              dislikeCount: { decrement: 1 },
            },
          });
        } else {
          await db.comment.update({
            where: { id: commentId },
            data: { 
              likeCount: { decrement: 1 },
              dislikeCount: { increment: 1 },
            },
          });
        }
      }
    } else {
      await db.commentLike.create({
        data: {
          userId: userId,
          commentId,
          type,
        },
      });

      if (type === "like") {
        await db.comment.update({
          where: { id: commentId },
          data: { likeCount: { increment: 1 } },
        });

        if (comment.userId !== userId) {
          const liker = await db.user.findUnique({
            where: { id: userId },
            select: { username: true },
          });

          const link = comment.novel?.slug
            ? comment.chapter
              ? `/novels/${comment.novel.slug}/chapters/${comment.chapter.chapterNumber}#comment-${commentId}`
              : `/novels/${comment.novel.slug}#comment-${commentId}`
            : null;

          if (link) {
            await db.notification.create({
              data: {
                userId: comment.userId,
                type: "comment_like",
                message: `${liker?.username || "Хэн нэгэн"} таны сэтгэгдэлд like дарлаа`,
                link,
              },
            });
          }
        }
      } else {
        await db.comment.update({
          where: { id: commentId },
          data: { dislikeCount: { increment: 1 } },
        });
      }
    }

    const updatedComment = await db.comment.findUnique({
      where: { id: commentId },
      select: { likeCount: true, dislikeCount: true },
    });

    return NextResponse.json({
      likeCount: updatedComment?.likeCount || 0,
      dislikeCount: updatedComment?.dislikeCount || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update like" },
      { status: 500 }
    );
  }
}
