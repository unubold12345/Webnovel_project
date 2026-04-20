import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Баталгаажуулах код оруулна уу" },
        { status: 400 }
      );
    }

    // Find user with this verification token
    const user = await db.user.findFirst({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Хүчингүй баталгаажуулах код эсвэл аль хэдийн баталгаажсан" },
        { status: 400 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: "Имэйл аль хэдийн баталгаажсан байна" },
        { status: 200 }
      );
    }

    // Mark email as verified and clear the token
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Имэйл амжилттай баталгаажлаа. Одоо нэвтэрч болно.",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Баталгаажуулахад алдаа гарлаа" },
      { status: 500 }
    );
  }
}
