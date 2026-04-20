import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string; volumeId: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "admin" && session.user.role !== "moderator")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { volumeId } = await params;
    const data = await req.json();

    const volume = await db.volume.update({
      where: { id: volumeId },
      data: {
        volumeNumber: data.volumeNumber,
        title: data.title,
        thumbnail: data.thumbnail,
      },
    });

    return NextResponse.json(volume);
  } catch (error) {
    console.error("Error updating volume:", error);
    return NextResponse.json(
      { error: "Failed to update volume" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string; volumeId: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "admin" && session.user.role !== "moderator")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { volumeId } = await params;

    await db.volume.delete({
      where: { id: volumeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting volume:", error);
    return NextResponse.json(
      { error: "Failed to delete volume" },
      { status: 500 }
    );
  }
}
