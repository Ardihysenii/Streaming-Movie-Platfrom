import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { BottomDock, Header } from "@/components/AppChrome";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SplashScreen } from "@/components/SplashScreen";
import "./globals.css";

export const metadata: Metadata = {
  title: "MONTANA — Your cinema, uninterrupted",
  description: "A personal, cinematic movie discovery and viewing interface.",
  applicationName: "MONTANA",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#070809",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://cinesrc.st" />
        <link rel="dns-prefetch" href="//cinesrc.st" />
      </head>
      <body>
        <Providers>
          <SplashScreen />
          <Header />
          {children}
          <Footer />
          <BottomDock />
          <SettingsPanel />
        </Providers>
      </body>
    </html>
  );
}
