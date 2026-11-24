import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: { default: "IntelliTrack | Internship Management", template: "%s | IntelliTrack" },
  description: "Internship management for Bo’s Coffee, bringing attendance, work records, progress, evaluations, documents, and reports into one organized workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${dmSans.className}`} suppressHydrationWarning>{children}</body>
    </html>
  );
}
