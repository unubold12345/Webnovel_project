import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/mockPaymentStore";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

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

    return NextResponse.json({
      success: true,
      order: {
        coins: order.coins,
        amount: order.amount,
        status: order.status,
      },
    });
  } catch (error) {
    console.error("Get order error:", error);
    return NextResponse.json(
      { error: "Failed to get order" },
      { status: 500 }
    );
  }
}
