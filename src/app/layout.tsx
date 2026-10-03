import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "AI Job Search",
  description: "Search jobs in plain English",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
