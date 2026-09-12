import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { ProductPreview } from "./product-preview";
import styles from "./landing.module.css";

function Brand() {
  return <a href="#overview" className={styles.brand} aria-label="IntelliTrack overview"><span className={styles.brandMark} aria-hidden="true">IT</span><span><strong>IntelliTrack</strong><small>Internship Management for Bo’s Coffee</small></span></a>;
}

export function LandingHeader() {
  return <header className={styles.header}><div className={styles.container + " " + styles.headerInner}>
    <Brand />
    <nav className={styles.navigation} aria-label="Public navigation"><a href="#overview">Overview</a><a href="#features">Features</a><a href="#how-it-works">How It Works</a></nav>
    <Link href="/login" className={styles.primaryButton} aria-label="Sign In to IntelliTrack"><span className={styles.desktopSignIn}>Sign In to IntelliTrack</span><span className={styles.mobileSignIn}>Sign In</span></Link>
  </div></header>;
}

export function HeroSection() {
  return <section id="overview" className={styles.hero}><div className={styles.container + " " + styles.heroGrid}>
    <div className={styles.heroCopy}>
      <p className={styles.pill}>One workspace. Every internship day.</p>
      <h1>Internship management,<br /><span>made effortless &amp; intelligent.</span></h1>
      <p className={styles.lead}>Bring attendance, daily Work Logs, Tasks, Evaluations, and internship progress together. IntelliTrack connects the people and records behind internships at Bo’s Coffee.</p>
      <div className={styles.actions}><Link href="/login" className={styles.primaryButton}>Sign In to IntelliTrack <Icon name="arrow" /></Link><a href="#how-it-works" className={styles.secondaryButton}>See How It Works</a></div>
      <p className={styles.accessNote}><Icon name="users" />For provisioned Interns, Company Supervisors, School Coordinators, and Company Representatives.</p>
    </div>
    <ProductPreview />
  </div></section>;
}

const features: { icon: IconName; title: string; copy: string; points: string[] }[] = [
  { icon: "clock", title: "Attendance & Location Evidence", copy: "Location-aware attendance with selfie evidence and server-recorded timestamps. Attendance is the source of credited time.", points: ["Time In / Time Out", "Attendance exceptions and corrections"] },
  { icon: "review", title: "Supervisor Workspace", copy: "Company Supervisors follow assigned Interns, manage Tasks, and provide Feedback and Evaluations with the work in view.", points: ["Task completion and revision", "Daily Work Log visibility"] },
  { icon: "school", title: "School Coordination", copy: "School Coordinators monitor students within their school scope. Company Representatives keep internship operations in view.", points: ["Internship progress monitoring", "Documents and authorized Reports"] },
  { icon: "journal", title: "Internship Progress & AI Assistance", copy: "Follow hours rendered against required hours. Where enabled, AI helps draft progress summaries, Portfolio reflections, and Evaluation remarks.", points: ["Progress from recorded attendance", "People review AI drafts before use"] },
];

export function FeatureGrid() {
  return <section id="features" className={styles.features}><div className={styles.container}>
    <div className={styles.sectionHeading}><p className={styles.pill}>One connected workspace</p><h2>Built for every part of<br className={styles.desktopBreak} /> the internship journey.</h2><p>From daily attendance to the bigger picture, keep internship work organized and the right people informed.</p></div>
    <div className={styles.cardGrid}>{features.map(feature => <article className={styles.featureCard} key={feature.title}><span className={styles.iconBlock}><Icon name={feature.icon} /></span><h3>{feature.title}</h3><p>{feature.copy}</p><ul>{feature.points.map(point => <li key={point}><Icon name="check" />{point}</li>)}</ul></article>)}</div>
  </div></section>;
}

const lifecycle = [
  ["Account & Onboarding", "Use your provisioned account, confirm internship details and required hours, and complete document requirements."],
  ["Attendance & Daily Work", "Record Time In and Time Out with attendance evidence. Write daily Work Logs, moving journals from Draft to Submitted."],
  ["Tasks, Feedback & Evaluation", "Work through assigned Tasks and revisions. Follow Feedback and finalized Evaluations throughout the internship."],
  ["Progress & Internship Completion", "Track hours rendered against requirements and bring recorded work together in your Portfolio and authorized Reports."],
];

export function LifecycleSection() {
  return <section id="how-it-works" className={styles.lifecycle}><div className={styles.container}>
    <div className={styles.workflowHeading}><p className={styles.eyebrow}>From onboarding to the final record</p><h2>A clearer path through<br className={styles.desktopBreak} /> the internship day.</h2><p>Each stage brings the next step into focus, with responsibilities kept in the hands of the people involved.</p></div>
    <ol className={styles.cardGrid}>{lifecycle.map(([title, copy], index) => <li className={styles.lifecycleCard} key={title}><span className={styles.phase}>Phase 0{index + 1}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol>
  </div></section>;
}

export function LandingCTA() {
  return <section className={styles.ctaSection} aria-labelledby="access-title"><div className={styles.container}><div className={styles.cta}>
    <p className={styles.ctaEyebrow}>IntelliTrack · Bo’s Coffee</p><h2 id="access-title">Your internship day,<br />all in one place.</h2><p>Access your attendance, daily work, and progress. Pick up where you left off in your IntelliTrack workspace.</p><Link href="/login" className={styles.lightButton}>Sign In to IntelliTrack <Icon name="arrow" /></Link>
  </div></div></section>;
}

export function LandingFooter() {
  return <footer className={styles.footer}><div className={styles.container}><div className={styles.footerGrid}>
    <div><Brand /><p>Connecting daily internship work with the people who guide it.</p></div>
    <nav aria-label="Explore IntelliTrack"><h2>Explore</h2><a href="#overview">Overview</a><a href="#features">Features</a><a href="#how-it-works">How It Works</a></nav>
    <div><h2>Access</h2><Link href="/login">Sign In to IntelliTrack</Link><p>Use the account issued for your internship. Access is provisioned by Company Operations.</p></div>
  </div><div className={styles.footerBottom}><span>IntelliTrack</span><span>Internship Management for Bo’s Coffee</span></div></div></footer>;
}
