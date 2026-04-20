import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = await params;
    const { content, isPinned } = await req.json();

    const comment = await db.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const isAdminOrMod = session.user.role === "admin" || session.user.role === "moderator";
    const isOwner = comment.userId === session.user.id;

    if (isPinned !== undefined) {
      if (!isAdminOrMod) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await db.comment.update({
        where: { id: commentId },
        data: {
          isPinned: isPinned === true,
        },
      });
    } else if (content !== undefined) {
      if (!isOwner && !isAdminOrMod) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (comment.deletedAt) {
        return NextResponse.json({ error: "Cannot edit deleted comment" }, { status: 400 });
      }
      await db.comment.update({
        where: { id: commentId },
        data: {
          content,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = await params;
    const { reason, hardDelete } = await req.json();

    const comment = await db.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const isAdminOrMod = session.user.role === "admin" || session.user.role === "moderator";
    const isOwner = comment.userId === session.user.id;

    if (!isAdminOrMod && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (hardDelete === true) {
      const canHardDelete = isAdminOrMod || isOwner;
      if (!canHardDelete) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await db.commentLike.deleteMany({
        where: { commentId },
      });
      await db.report.deleteMany({
        where: { commentId },
      });
      await db.comment.delete({
        where: { id: commentId },
      });
    } else {
      await db.comment.update({
        where: { id: commentId },
        data: {
          deletedAt: new Date(),
          deletedByOwner: isOwner && !isAdminOrMod,
          deletedReason: reason || null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}