import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SITE_NAME } from "@/lib/constants";
import AppShell from "@/components/AppShell";
import RegisterSW from "@/components/RegisterSW";
import Splash from "@/components/Splash";
import { THEME_INIT_SCRIPT } from "@/hooks/useTheme";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${SITE_NAME} — Study in Germany`, template: `%s · ${SITE_NAME}` },
  description:
    "Track your German student visa journey with real applicant data — queue movement, processing trends, estimated timelines and outcomes.",
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Visa Tracker", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efeee9" },
    { media: "(prefers-color-scheme: dark)", color: "#111412" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans">
        <AppShell>{children}</AppShell>
        <Splash />
        <RegisterSW />
      </body>
    </html>
  );
}
