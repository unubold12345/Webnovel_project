import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionPlan: true, subscriptionExpiresAt: true },
    });

    if (!user?.subscriptionPlan || !user.subscriptionExpiresAt) {
      return NextResponse.json({ ok: true });
    }

    const now = new Date();
    const expiresAt = new Date(user.subscriptionExpiresAt);

    // If expired, create notification and clear subscription
    if (expiresAt < now) {
      // Very short dedup (1 min) to avoid duplicate notifications from rapid polling
      const recentNotification = await db.notification.findFirst({
        where: {
          userId: session.user.id,
          type: "subscription_expired",
          createdAt: {
            gte: new Date(now.getTime() - 60 * 1000),
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!recentNotification) {
        await db.$transaction([
          db.user.update({
            where: { id: session.user.id },
            data: {
              subscriptionPlan: null,
              subscriptionExpiresAt: null,
            },
          }),
          db.subscriptionHistory.create({
            data: {
              userId: session.user.id,
              plan: user.subscriptionPlan,
              action: "expired",
            },
          }),
          db.notification.create({
            data: {
              userId: session.user.id,
              type: "subscription_expired",
              message: `Таны ${user.subscriptionPlan === "simple" ? "Simple" : "Medium"} төлөвлөгөөний хугацаа дууслаа. Дахин сунгахыг хүсвэл захиалгын хуудас руу орно уу.`,
              link: "/subscription",
            },
          }),
        ]);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to check subscription" }, { status: 500 });
  }
}
