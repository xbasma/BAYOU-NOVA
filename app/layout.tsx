import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource/syncopate/400.css";
import "@fontsource/syncopate/700.css";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import AppShell from "@/components/layout/AppShell";

// On Vercel, VERCEL_PROJECT_PRODUCTION_URL is set automatically (no manual env var needed).
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "BAYOU-NOVA | Intelligent Health Monitoring for the Space Frontier",
  description:
    "Proof-of-concept astronaut health monitoring platform for long-duration missions. Built for the 2026 NASA Space Apps Challenge using simulated data.",
  openGraph: {
    title: "BAYOU-NOVA | Intelligent Health Monitoring for the Space Frontier",
    description:
      "Monitor, detect, investigate, act, follow up. A proof of concept using simulated demonstration data. Not a medical device.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#231423",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
