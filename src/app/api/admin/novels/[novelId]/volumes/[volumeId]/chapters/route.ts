import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET - List all chapters for a volume
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string; volumeId: string }> }
) {
  try {
    const { volumeId } = await params;

    const chapters = await db.volumeChapter.findMany({
      where: { volumeId },
      orderBy: { chapterNumber: "asc" },
    });

    return NextResponse.json(chapters);
  } catch (error) {
    console.error("Error fetching volume chapters:", error);
    return NextResponse.json(
      { error: "Failed to fetch chapters" },
      { status: 500 }
    );
  }
}

// POST - Create a new chapter for a volume
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string; volumeId: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "admin" && session.user.role !== "moderator")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { novelId, volumeId } = await params;
    const data = await req.json();

    // Convert chapterNumber to integer
    const chapterNumber = parseInt(data.chapterNumber, 10);

    // Check if chapter number already exists for this volume
    const existingChapter = await db.volumeChapter.findUnique({
      where: {
        volumeId_chapterNumber: {
          volumeId,
          chapterNumber,
        },
      },
    });

    if (existingChapter) {
      return NextResponse.json(
        { error: "Chapter number already exists in this volume" },
        { status: 400 }
      );
    }

    // Create the chapter
    const chapter = await db.volumeChapter.create({
      data: {
        volumeId,
        chapterNumber,
        title: data.title,
        content: data.content,
        contentImages: JSON.stringify(data.contentImages || []),
        images: JSON.stringify(data.images || []),
      },
    });

    return NextResponse.json(chapter);
  } catch (error) {
    console.error("Error creating volume chapter:", error);
    return NextResponse.json(
      { error: "Failed to create chapter" },
      { status: 500 }
    );
  }
}
