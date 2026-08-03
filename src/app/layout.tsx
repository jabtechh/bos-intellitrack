import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IntelliTrack",
  description: "AI-Powered Internship Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
