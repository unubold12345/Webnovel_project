import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "admin" && session.user.role !== "moderator")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { novelId } = await params;
    const data = await req.json();

    const existingVolume = await db.volume.findUnique({
      where: {
        novelId_volumeNumber: {
          novelId,
          volumeNumber: data.volumeNumber,
        },
      },
    });

    if (existingVolume) {
      return NextResponse.json(
        { error: "Volume number already exists" },
        { status: 400 }
      );
    }

    const volume = await db.volume.create({
      data: {
        novelId,
        volumeNumber: data.volumeNumber,
        title: data.title,
        thumbnail: data.thumbnail || null,
      },
    });

    return NextResponse.json(volume);
  } catch (error) {
    console.error("Error creating volume:", error);
    return NextResponse.json(
      { error: "Failed to create volume" },
      { status: 500 }
    );
  }
}
