import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Имэйл хаяг шаардлагатай" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists for security
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "Хэрэв ийм имэйл бүртгэлтэй бол нууц үг сэргээх холбоос илгээгдсэн байна.",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    const emailResult = await sendPasswordResetEmail(email, resetToken);

    return NextResponse.json({
      success: true,
      message: "Хэрэв ийм имэйл бүртгэлтэй бол нууц үг сэргээх холбоос илгээгдсэн байна.",
      devMode: emailResult.devMode,
      resetUrl: emailResult.devMode ? emailResult.resetUrl : undefined,
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Алдаа гарлаа: " + (error?.message || "Тодорхойгүй алдаа") },
      { status: 500 }
    );
  }
}
