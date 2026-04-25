import { NextRequest, NextResponse } from "next/server";
import { getSiteSettings, setSiteSettings } from "@/lib/siteSettings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = getSiteSettings();
    return NextResponse.json({
      logoDarkUrl: settings.logoDarkUrl ?? null,
      logoLightUrl: settings.logoLightUrl ?? null,
      heroMediaUrl: settings.heroMediaUrl ?? null,
      heroMediaType: settings.heroMediaType ?? null,
    });
  } catch (error) {
    console.error("Error fetching logo:", error);
    return NextResponse.json({ error: "Failed to fetch logo" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { logoDarkUrl, logoLightUrl, heroMediaUrl, heroMediaType } = body;

    if (
      logoDarkUrl === undefined &&
      logoLightUrl === undefined &&
      heroMediaUrl === undefined &&
      heroMediaType === undefined
    ) {
      return NextResponse.json({ error: "At least one field is required" }, { status: 400 });
    }

    const update: Partial<{
      logoDarkUrl: string | null;
      logoLightUrl: string | null;
      heroMediaUrl: string | null;
      heroMediaType: "image" | "video" | null;
    }> = {};
    if (logoDarkUrl !== undefined) update.logoDarkUrl = logoDarkUrl || null;
    if (logoLightUrl !== undefined) update.logoLightUrl = logoLightUrl || null;
    if (heroMediaUrl !== undefined) update.heroMediaUrl = heroMediaUrl || null;
    if (heroMediaType !== undefined) update.heroMediaType = heroMediaType || null;

    const updated = setSiteSettings(update);
    return NextResponse.json({
      logoDarkUrl: updated.logoDarkUrl ?? null,
      logoLightUrl: updated.logoLightUrl ?? null,
      heroMediaUrl: updated.heroMediaUrl ?? null,
      heroMediaType: updated.heroMediaType ?? null,
    });
  } catch (error) {
    console.error("Error saving logo:", error);
    return NextResponse.json({ error: "Failed to save logo" }, { status: 500 });
  }
}
