import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZAYNFAMY // PILOT TRACKER",
  description: "Roblox Account Tracking System",
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
