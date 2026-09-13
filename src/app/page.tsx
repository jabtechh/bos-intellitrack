import localFont from "next/font/local";
import type { Metadata } from "next";
import { LandingHeader, HeroSection, FeatureGrid, LifecycleSection, LandingCTA, LandingFooter } from "@/components/landing/sections";
import styles from "@/components/landing/landing.module.css";

const jakarta = localFont({ src: "../components/landing/fonts/PlusJakartaSans.ttf", display: "swap", variable: "--font-landing", weight: "200 800" });

export const metadata: Metadata = {
  title: { absolute: "IntelliTrack | Internship Management" },
  description: "IntelliTrack is an internship management system for Bo’s Coffee, bringing attendance, daily Work Logs, Tasks, Evaluations, and internship progress into one workspace.",
};

export default function Home() {
  return (
    <div className={`${jakarta.variable} ${styles.page}`}>
      <a className={styles.skipLink} href="#landing-main">Skip to main content</a>
      <LandingHeader />
      <main id="landing-main" tabIndex={-1}>
        <HeroSection />
        <FeatureGrid />
        <LifecycleSection />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
