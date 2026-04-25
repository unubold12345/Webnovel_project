import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, message, link, type } = await req.json();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const trimmedMessage = message.trim();
    const notificationType = type && typeof type === "string" ? type.trim() : "admin";
    const notificationLink = link && typeof link === "string" && link.trim().length > 0 ? link.trim() : null;

    if (userId && typeof userId === "string" && userId.length > 0) {
      // Send to specific user
      const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      await db.notification.create({
        data: {
          userId: user.id,
          type: notificationType,
          message: trimmedMessage,
          link: notificationLink,
        },
      });

      return NextResponse.json({ success: true, count: 1 });
    }

    // Send to all users
    const users = await db.user.findMany({ select: { id: true } });

    if (users.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Batch insert in chunks of 500 to stay within database limits
    const chunkSize = 500;
    for (let i = 0; i < users.length; i += chunkSize) {
      const chunk = users.slice(i, i + chunkSize);
      await db.notification.createMany({
        data: chunk.map((u) => ({
          userId: u.id,
          type: notificationType,
          message: trimmedMessage,
          link: notificationLink,
        })),
        skipDuplicates: false,
      });
    }

    return NextResponse.json({ success: true, count: users.length });
  } catch {
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
