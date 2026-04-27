import type { Metadata, Viewport } from "next";
import { Roboto_Condensed, Dancing_Script } from "next/font/google";
import "./globals.css";
import Providers from "@/components/ui/Providers";
import LayoutShell from "@/components/ui/LayoutShell";

const robotoCondensed = Roboto_Condensed({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto-condensed",
  display: "swap",
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dancing-script",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dream Novel",
  description: "Read novels online",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f0f13" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

const themeScript = `
  (function() {
    const theme = localStorage.getItem('theme');
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${robotoCondensed.variable} ${dancingScript.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <Providers>
        <LayoutShell className={robotoCondensed.className}>
          {children}
        </LayoutShell>
      </Providers>
    </html>
  );
}
