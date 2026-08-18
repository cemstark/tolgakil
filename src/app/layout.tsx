import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

// latin-ext olmadan ğ ş ı İ ç ö ü harfleri yedek yazı tipine düşer.
const display = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400"],
  variable: "--font-display",
  display: "swap",
});

const body = Outfit({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Akıl Hukuk Bürosu",
  description: "Aile, iş ve ticaret hukuku alanlarında dava takibi ve danışmanlık.",
};

type RootLayoutProps = { children: React.ReactNode };

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="tr" className={`${display.variable} ${body.variable}`}>
      <body>
        <a href="#content" className="skipLink">
          İçeriğe atla
        </a>
        <SiteHeader />
        <main id="content" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
