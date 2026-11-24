import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "./globals.css";

const persianFont = localFont({
  src: "./fonts/Estedad-variable.woff2",
  variable: "--font-ornova-text",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

const displayFont = localFont({ src: "./fonts/Gandom.woff2", variable: "--font-ornova-display", weight: "400", style: "normal", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "Ornova by Yas",
  description: "خانه‌ای آرام برای جواهرات نقره با طراحی دیجیتال",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://ornova.ir"),
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f0e9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={`${persianFont.variable} ${displayFont.variable} h-full antialiased`}>
      <body className="min-h-full bg-ivory text-graphite">
        <div className="flex min-h-screen flex-col">
          <a href="#main-content" className="skip-link">رفتن به محتوای صفحه</a>
          <SiteHeader />
          <main id="main-content" className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
