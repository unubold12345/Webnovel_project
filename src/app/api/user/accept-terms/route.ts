import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await req.json();

    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { acceptedTermsAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      acceptedTermsAt: updatedUser.acceptedTermsAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("Error accepting terms:", error);
    return NextResponse.json(
      { error: "Failed to accept terms" },
      { status: 500 }
    );
  }
}
