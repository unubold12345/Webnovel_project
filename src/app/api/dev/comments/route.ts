import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.commentLike.deleteMany({});

    await db.comment.deleteMany({});

    return NextResponse.json({
      success: true,
      message: "All comments and comment likes have been deleted. Novels and accounts are untouched."
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete comments" },
      { status: 500 }
    );
  }
}