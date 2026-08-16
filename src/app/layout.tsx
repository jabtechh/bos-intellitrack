import type { Metadata } from "next";
import "./globals.css";

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
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
