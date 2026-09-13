import type { Metadata } from "next";
import { LandingHeader, HeroSection, WorkspaceRoles, FeatureGrid, LifecycleSection, LandingCTA, LandingFooter } from "@/components/landing/sections";
import styles from "@/components/landing/landing.module.css";

export const metadata: Metadata = {
  title: { absolute: "IntelliTrack | Internship Management" },
  description: "IntelliTrack is an internship management system for Bo’s Coffee, bringing attendance, daily Work Logs, Tasks, Evaluations, and internship progress into one workspace.",
};

export default function Home() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#landing-main">Skip to main content</a>
      <LandingHeader />
      <main id="landing-main" tabIndex={-1}>
        <HeroSection />
        <WorkspaceRoles />
        <FeatureGrid />
        <LifecycleSection />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
