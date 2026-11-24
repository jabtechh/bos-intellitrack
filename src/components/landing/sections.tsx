import Image from "next/image";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { ProductPreview } from "./product-preview";
import styles from "./landing.module.css";

function Brand() {
  return <a className={styles.identity} href="#overview" aria-label="IntelliTrack overview">
    <span className={styles.monogram} aria-hidden="true"><Image src="/brand/bos-cup-mark.png" alt="" width={80} height={80} priority /></span>
    <span><strong>IntelliTrack</strong><small>Internship Management for Bo’s Coffee</small></span>
  </a>;
}

export function LandingHeader() {
  return <header className={styles.masthead}>
    <div className={styles.headerLayout}>
      <Brand />
      <nav aria-label="Public navigation" className={styles.navigation}>
        <a href="#overview">Overview</a><a href="#features">Features</a><a href="#how-it-works">How It Works</a>
      </nav>
      <Link className={styles.primaryAction} href="/login" aria-label="Sign In to IntelliTrack"><span className={styles.fullLabel}>Sign In to IntelliTrack</span><span className={styles.shortLabel}>Sign In</span></Link>
    </div>
  </header>;
}

export function HeroSection() {
  return <section id="overview" className={styles.heroSection}>
    <div className={styles.heroLayout}>
      <div className={styles.heroContent}>
        <p className={styles.eyebrowBadge}><span aria-hidden="true" />Bo’s Coffee internships · One workspace, every day.</p>
        <h1>Internship<br className={styles.heroBreak} /> management,<br /><em>made effortless &amp; intelligent.</em></h1>
        <p className={styles.heroDescription}>Attendance, daily Work Logs, Tasks, and internship progress, connected. IntelliTrack brings your work and the people guiding it into one clear workspace.</p>
        <div className={styles.heroActions}>
          <Link href="/login" className={styles.primaryAction}>Sign In to IntelliTrack <Icon name="arrow" /></Link>
          <a href="#how-it-works" className={styles.secondaryAction}>See How It Works</a>
        </div>
        <p className={styles.accessLine}><Icon name="check" />Secure access for provisioned Interns, Company Supervisors, School Coordinators, and Company Representatives.</p>
      </div>
      <ProductPreview />
    </div>
  </section>;
}

const features: { icon: IconName; title: string; description: string; details: string[] }[] = [
  { icon: "clock", title: "Attendance & Evidence", description: "Record Time In and Time Out with selfie evidence, location context, and server-recorded timestamps. Attendance is the source of credited time.", details: ["Attendance history and evidence", "Exceptions and correction requests"] },
  { icon: "review", title: "Tasks & Daily Work", description: "Keep assigned Tasks and daily Work Logs in view. Share work, respond to revisions, and follow your Supervisor’s Feedback and Evaluations.", details: ["Task completion and revisions", "Daily journals from Draft to Submitted"] },
  { icon: "school", title: "School Coordination", description: "School Coordinators follow students within their school scope, with internship progress, Documents, and authorized Reports in one place.", details: ["School-scoped student visibility", "Documents and progress reports"] },
  { icon: "journal", title: "Internship Progress", description: "See hours rendered against required hours. Bring recorded work into your Portfolio, with AI drafting assistance where enabled.", details: ["Progress from recorded attendance", "People review AI drafts before use"] },
];

export function FeatureGrid() {
  return <section id="features" className={styles.featureSection}>
    <div className={styles.container}>
      <header className={styles.sectionIntro}><p className={styles.eyebrowBadge}>One connected workspace</p><h2>Built for every part of<br />the internship journey.</h2><p>From the first Time In to the final record, keep the work organized and the right people informed.</p></header>
      <figure className={styles.storeFeature}><Image src="/brand/bos-store-sign.jpg" alt="Bo’s Coffee store front with its illuminated sign" fill sizes="(max-width: 1279px) 100vw, 76rem" /><figcaption><span className={styles.storeFeatureMark} aria-hidden="true"><Image src="/brand/bos-cup-mark.png" alt="" width={64} height={64} /></span><span><strong>Bo’s Coffee</strong><small>Where your internship day happens.</small></span></figcaption></figure>
      <div className={styles.featureGrid}>{features.map(({icon,title,description,details}) =>
        <article key={title} className={styles.capability}>
          <div className={styles.capabilityHeading}><span className={styles.featureIcon}><Icon name={icon} /></span><h3>{title}</h3></div>
          <p>{description}</p>
          <ul>{details.map(detail => <li key={detail}><Icon name="check" /><span>{detail}</span></li>)}</ul>
        </article>
      )}</div>
    </div>
  </section>;
}

const phases = [
  ["Account & Onboarding", "Use your provisioned account, confirm internship details and required hours, and complete document requirements."],
  ["Attendance & Daily Work", "Record Time In and Time Out with attendance evidence. Keep daily Work Logs moving from Draft to Submitted."],
  ["Tasks, Feedback & Evaluation", "Complete assigned work, respond to revisions, and follow Feedback and finalized Evaluations."],
  ["Progress & Internship Completion", "Follow hours rendered and bring recorded work together in your Portfolio and authorized Reports."],
];

export function LifecycleSection() {
  return <section id="how-it-works" className={styles.journeySection}><div className={styles.container}>
    <header className={styles.journeyIntro}><p className={styles.overline}>From onboarding to the final record</p><h2>A clear path through<br />your internship.</h2><p>Every stage stays connected, with clear responsibilities for the people doing the work and the people guiding it.</p></header>
    <ol className={styles.phaseGrid}>{phases.map(([title,description],index) => <li key={title} className={styles.phaseCard}><span className={styles.phaseNumber}>Phase 0{index+1}</span><h3>{title}</h3><p>{description}</p></li>)}</ol>
  </div></section>;
}

export function LandingCTA() {
  return <section className={styles.invitationSection} aria-labelledby="access-title"><div className={styles.container}>
    <div className={styles.invitation}>
      <div className={styles.invitationContent}><p className={styles.invitationLabel}>IntelliTrack · Bo’s Coffee</p><h2 id="access-title">Your internship day,<br />all in one place.</h2><p>Access your attendance, daily work, Tasks, and internship progress from one IntelliTrack workspace.</p><Link href="/login" className={styles.inverseAction}>Sign In to IntelliTrack <Icon name="arrow" /></Link></div>
    </div>
  </div></section>;
}

export function LandingFooter() {
  return <footer className={styles.siteFooter}><div className={styles.container}>
    <div className={styles.footerColumns}>
      <div className={styles.footerIdentity}><Brand /><p>Connecting daily internship work with the people who guide it.</p></div>
      <nav aria-label="Explore IntelliTrack"><h2>Explore</h2><a href="#overview">Overview</a><a href="#features">Features</a><a href="#how-it-works">How It Works</a></nav>
      <div><h2>Your workspace</h2><Link href="/login">Sign In to IntelliTrack</Link><p>Attendance, Work Logs, Tasks, and progress in one place.</p></div>
      <div><h2>Account access</h2><p>Use the account issued for your internship. Access is provisioned by Company Operations.</p></div>
    </div>
    <div className={styles.footerRule}><span>IntelliTrack</span><span>Internship Management for Bo’s Coffee</span></div>
  </div></footer>;
}
