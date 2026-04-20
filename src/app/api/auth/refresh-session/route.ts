import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ 
      user: {
        id: session.user.id,
        role: session.user.role,
        isRestricted: session.user.isRestricted
      }
    });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
}