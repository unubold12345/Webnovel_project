import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.commentLike.deleteMany({});
    await db.comment.deleteMany({});

    return NextResponse.json({ success: true, message: "All comments deleted" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete comments" },
      { status: 500 }
    );
  }
}
