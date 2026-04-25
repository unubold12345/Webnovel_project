import fs from "fs";
import path from "path";

const SETTINGS_PATH = path.join(process.cwd(), "data", "site-settings.json");

export interface SiteSettings {
  logoDarkUrl?: string | null;
  logoLightUrl?: string | null;
  heroMediaUrl?: string | null;
  heroMediaType?: "image" | "video" | null;
  updatedAt?: string;
}

export function getSiteSettings(): SiteSettings {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = fs.readFileSync(SETTINGS_PATH, "utf-8");
      return JSON.parse(data) as SiteSettings;
    }
  } catch {
    // ignore
  }
  return {};
}

export function setSiteSettings(settings: Partial<SiteSettings>): SiteSettings {
  const current = getSiteSettings();
  const updated: SiteSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}
