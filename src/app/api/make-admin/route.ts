import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Temporary endpoint to make unubo an admin
// Remove this file after use!
export async function GET(req: NextRequest) {
  try {
    const user = await db.user.update({
      where: { username: "unubo" },
      data: { role: "admin" },
    });

    return NextResponse.json({
      success: true,
      message: `User ${user.username} is now an admin`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Error making user admin:", error);
    return NextResponse.json(
      { error: "Failed to make user admin: " + error.message },
      { status: 500 }
    );
  }
}
