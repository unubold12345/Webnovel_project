import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { username, email } = await req.json();

    if (!username && !email) {
      return NextResponse.json(
        { error: "Хэрэглэгчийн нэр эсвэл имэйл шаардлагатай" },
        { status: 400 }
      );
    }

    // Find user by username or email
    let user = null;
    if (username) {
      user = await db.user.findUnique({
        where: { username },
      });
    }
    // If not found by username or only email provided, try by email
    if (!user && email) {
      user = await db.user.findUnique({
        where: { email },
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "Хэрэглэгч олдсонгүй" },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Имэйл аль хэдийн баталгаажсан байна" },
        { status: 400 }
      );
    }

    // Generate new verification token
    const verifyToken = crypto.randomBytes(32).toString("hex");

    // Update user with new token
    await db.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: verifyToken },
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(user.email, verifyToken);

    return NextResponse.json({
      success: true,
      message: "Баталгаажуулах имэйл дахин илгээгдлээ",
      devMode: emailResult.devMode,
      verificationUrl: emailResult.devMode ? emailResult.verificationUrl : undefined,
    });
  } catch (error: any) {
    console.error("Resend verification error:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    return NextResponse.json(
      { error: "Имэйл илгээхэд алдаа гарлаа: " + (error?.message || "Тодорхойгүй алдаа") },
      { status: 500 }
    );
  }
}
