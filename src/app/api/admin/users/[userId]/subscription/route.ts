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
    const { plan, minutes } = body;

    if (!plan || !["simple", "medium"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!minutes || typeof minutes !== "number" || minutes <= 0) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const expiresAt = new Date(Date.now() + minutes * 60000);
    const coinAmount = plan === "simple" ? 20000 : 30000;

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: plan,
        subscriptionExpiresAt: expiresAt,
        coins: { increment: coinAmount },
      },
    });

    await db.coinHistory.create({
      data: {
        userId,
        amount: coinAmount,
        balance: updatedUser.coins,
        type: "topup",
        description: `Багц олголт (${plan === "simple" ? "Simple" : "Medium"}): +${coinAmount} зоос`,
      },
    });

    await db.subscriptionHistory.create({
      data: {
        userId,
        plan,
        action: "granted",
        grantedBy: session.user.id,
        durationMinutes: minutes,
        coinsGranted: coinAmount,
      },
    });

    await db.notification.create({
      data: {
        userId,
        type: "subscription_granted",
        message: `Танд ${plan === "simple" ? "Simple" : "Medium"} төлөвлөгөө олгогдлоо. Дуусах: ${expiresAt.toLocaleString()}`,
        link: `/subscription`,
      },
    });

    return NextResponse.json({
      success: true,
      plan: updatedUser.subscriptionPlan,
      expiresAt: updatedUser.subscriptionExpiresAt?.toISOString(),
      coins: updatedUser.coins,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to grant subscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, subscriptionPlan: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const previousPlan = user.subscriptionPlan;

    await db.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: null,
        subscriptionExpiresAt: null,
      },
    });

    if (previousPlan) {
      await db.subscriptionHistory.create({
        data: {
          userId,
          plan: previousPlan,
          action: "revoked",
          grantedBy: session.user.id,
        },
      });
    }

    await db.notification.create({
      data: {
        userId,
        type: "subscription_revoked",
        message: `Таны захиалга цуцлагдлаа.`,
        link: `/subscription`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to revoke subscription" },
      { status: 500 }
    );
  }
}
