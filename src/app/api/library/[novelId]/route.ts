import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ novelId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { novelId } = await params;

    const savedNovel = await db.savedNovel.findUnique({
      where: {
        userId_novelId: { userId: session.user.id, novelId },
      },
    });

    if (!savedNovel) {
      return NextResponse.json({ error: "Saved novel not found" }, { status: 404 });
    }

    await db.savedNovel.delete({
      where: { id: savedNovel.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove saved novel:", error);
    return NextResponse.json({ error: "Failed to remove saved novel" }, { status: 500 });
  }
}
