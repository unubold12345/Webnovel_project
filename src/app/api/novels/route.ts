import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getNovelViewCounts } from "@/lib/views";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { author: { contains: search, mode: "insensitive" as const } },
            { translator: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const novels = await db.webnovel.findMany({
      where: {
        ...where,
        hidden: false,
      },
      orderBy: { createdAt: "desc" },
    });

    const viewCounts = await getNovelViewCounts();
    const novelsWithViews = novels.map((novel) => ({
      ...novel,
      totalViews: viewCounts.get(novel.id) || 0,
    }));

    return NextResponse.json(novelsWithViews);
  } catch (error) {
    console.error("Error fetching novels:", error);
    return NextResponse.json(
      { error: "Зохиолуудыг татахад алдаа гарлаа" },
      { status: 500 }
    );
  }
}