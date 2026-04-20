import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ avatar: null });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true },
    });

    return NextResponse.json({ avatar: user?.avatar || null });
  } catch {
    return NextResponse.json({ avatar: null });
  }
}