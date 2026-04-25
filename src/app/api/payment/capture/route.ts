import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrder, deleteOrder } from "@/lib/mockPaymentStore";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const order = getOrder(token);
    if (!order) {
      return NextResponse.json(
        { error: "Order not found or expired" },
        { status: 404 }
      );
    }

    if (order.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (order.status === "captured") {
      return NextResponse.json(
        { error: "Order already captured" },
        { status: 400 }
      );
    }

    if (order.status === "cancelled") {
      return NextResponse.json(
        { error: "Order was cancelled" },
        { status: 400 }
      );
    }

    // Add coins to user
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { coins: { increment: order.coins } },
    });

    // Record in coin history
    await db.coinHistory.create({
      data: {
        userId: session.user.id,
        amount: order.coins,
        balance: updatedUser.coins,
        type: "topup",
        description: `Recharge: +${order.coins} coins ($${order.amount})`,
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: session.user.id,
        type: "topup",
        message: `Танд ${order.coins} зоос нэмэгдлээ.`,
        link: `/user/${session.user.id}/history`,
      },
    });

    // Delete order so token expires immediately after payment
    deleteOrder(token);

    return NextResponse.json({
      success: true,
      coins: updatedUser.coins,
      added: order.coins,
    });
  } catch (error) {
    console.error("Capture payment error:", error);
    return NextResponse.json(
      { error: "Payment capture failed" },
      { status: 500 }
    );
  }
}
