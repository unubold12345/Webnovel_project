import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Хэрэглэгчийн нэр, имэйл болон нууц үг шаардлагатай" },
        { status: 400 }
      );
    }

    const existingUsername = await db.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: "Хэрэглэгчийн нэр аль хэдийн ашиглагдаж байна" },
        { status: 400 }
      );
    }

    const existingEmail = await db.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "Имэйл аль хэдийн бүртгэгдсэн байна" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate verification token
    const verifyToken = crypto.randomBytes(32).toString("hex");

    const user = await db.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: "user",
        emailVerified: false,
        emailVerifyToken: verifyToken,
      },
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(email, verifyToken);

    return NextResponse.json({ 
      success: true, 
      message: "Бүртгэл амжилттай. Таны имэйл хаяг руу баталгаажуулах холбоос илгээлээ (заавал биш, профайл хуудаснаас хожим баталгаажуулж болно).",
      devMode: emailResult.devMode,
      verificationUrl: emailResult.devMode ? emailResult.verificationUrl : undefined,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    // Log more details for debugging
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
    });
    return NextResponse.json(
      { error: "Бүртгүүлж чадсангүй: " + (error?.message || "Тодорхойгүй алдаа") },
      { status: 500 }
    );
  }
}