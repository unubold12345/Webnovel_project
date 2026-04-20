import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "admin" && session.user.role !== "moderator")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { novelId } = await params;

    const scheduledChapters = await db.scheduledChapter.findMany({
      where: { novelId },
      orderBy: { chapterNumber: "asc" },
    });

    return NextResponse.json(scheduledChapters);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch scheduled chapters" },
      { status: 500 }
    );
  }
}

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

    const existingScheduled = await db.scheduledChapter.findUnique({
      where: {
        novelId_chapterNumber: {
          novelId,
          chapterNumber: data.chapterNumber,
        },
      },
    });

    if (existingScheduled) {
      return NextResponse.json(
        { error: "Scheduled chapter already exists" },
        { status: 400 }
      );
    }

    const scheduledChapter = await db.scheduledChapter.create({
      data: {
        novelId,
        chapterNumber: data.chapterNumber,
        title: data.title,
        scheduledFor: new Date(data.scheduledFor),
      },
    });

    return NextResponse.json(scheduledChapter);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create scheduled chapter" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "admin" && session.user.role !== "moderator")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { novelId } = await params;
    const { searchParams } = new URL(req.url);
    const chapterNumber = searchParams.get("chapterNumber");

    if (!chapterNumber) {
      return NextResponse.json(
        { error: "Chapter number is required" },
        { status: 400 }
      );
    }

    await db.scheduledChapter.delete({
      where: {
        novelId_chapterNumber: {
          novelId,
          chapterNumber: parseInt(chapterNumber),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete scheduled chapter" },
      { status: 500 }
    );
  }
}