import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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

    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.role === "admin") {
      return NextResponse.json(
        { error: "Cannot delete admin accounts" },
        { status: 403 }
      );
    }

    await db.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const body = await req.json();
    const { role, isRestricted } = body;

    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentUserRole = session.user.role;

    if (role !== undefined) {
      if (currentUserRole !== "admin") {
        return NextResponse.json(
          { error: "Only admins can change roles" },
          { status: 403 }
        );
      }

      if (!["user", "moderator", "admin"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }

      if (role === "admin" && userId === session.user.id) {
        return NextResponse.json(
          { error: "Cannot change your own admin role" },
          { status: 400 }
        );
      }

      await db.user.update({
        where: { id: userId },
        data: { role },
      });
    }

    if (isRestricted !== undefined) {
      if (currentUserRole !== "admin" && currentUserRole !== "moderator") {
        return NextResponse.json(
          { error: "Only admins and moderators can restrict accounts" },
          { status: 403 }
        );
      }

      if (userId === session.user.id) {
        return NextResponse.json(
          { error: "Cannot restrict your own account" },
          { status: 400 }
        );
      }

      await db.user.update({
        where: { id: userId },
        data: { isRestricted },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}