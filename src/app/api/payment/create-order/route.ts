import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setOrder, cleanupOldOrders } from "@/lib/mockPaymentStore";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { coins, amount } = body;

    if (!coins || typeof coins !== "number" || coins <= 0) {
      return NextResponse.json(
        { error: "Invalid coin amount" },
        { status: 400 }
      );
    }

    // Generate unique token
    const token = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    setOrder(token, {
      userId: session.user.id,
      coins,
      amount,
      status: "created",
      createdAt: Date.now(),
    });

    // Clean up old orders
    cleanupOldOrders();

    return NextResponse.json({
      success: true,
      token,
      checkoutUrl: `/checkout/${token}`,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    );
  }
}
