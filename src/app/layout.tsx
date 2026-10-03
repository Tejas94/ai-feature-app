import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "Product Catalog Builder",
  description: "Photograph a product and get a validated catalogue entry",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site">
          <nav>
            <Link href="/" className="brand">
              Product Catalog Builder
            </Link>
            <Link href="/">New entry</Link>
            <Link href="/catalog">Catalogue</Link>
            <Link href="/stats">Stats</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
