import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shipmas Day 1",
  description: "A gift-wrapped loading experience with personalized compliments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

