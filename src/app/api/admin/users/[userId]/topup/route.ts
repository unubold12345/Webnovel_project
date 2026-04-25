import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const body = await req.json();
    const { amount } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, coins: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { coins: { increment: amount } },
    });

    await db.coinHistory.create({
      data: {
        userId,
        amount,
        balance: updatedUser.coins,
        type: "topup",
        description: `Admin top-up: +${amount} coins`,
      },
    });

    await db.notification.create({
      data: {
        userId,
        type: "topup",
        message: `Танд ${amount} зоос нэмэгдлээ.`,
        link: `/user/${userId}/history`,
      },
    });

    return NextResponse.json({
      success: true,
      coins: updatedUser.coins,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to top up coins" },
      { status: 500 }
    );
  }
}
