import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { username },
      select: { isRestricted: true },
    });

    if (!user) {
      return NextResponse.json({ isRestricted: false });
    }

    return NextResponse.json({ isRestricted: user.isRestricted });
  } catch (error) {
    return NextResponse.json({ isRestricted: false, emailVerified: null });
  }
}