import { Icon } from "@/components/icons";
import styles from "./landing.module.css";

export function ProductPreview() {
  return <figure className={styles.preview} aria-labelledby="preview-caption">
    <div className={styles.previewFrame}>
      <div className={styles.windowBar}><span className={styles.windowDots} aria-hidden="true"><i /><i /><i /></span><span>IntelliTrack workspace</span><span className={styles.sampleLabel}>Illustrative preview</span></div>
      <div className={styles.previewBody}>
        <div className={styles.previewWelcome}><span className={styles.brandMark} aria-hidden="true">IT</span><div><p>Intern workspace</p><h2>Your day, at a glance.</h2></div><Icon name="bell" /></div>
        <div className={styles.previewMetrics}>
          <div className={styles.previewCard}><h3>Internship Progress</h3><strong>120 <small>/ 240 h</small></strong><div className={styles.progressTrack} role="meter" aria-label="Illustrative internship progress" aria-valuemin={0} aria-valuemax={240} aria-valuenow={120}><span /></div><p>Hours rendered / Required hours</p></div>
          <div className={styles.previewCard}><h3>Attendance</h3><strong className={styles.status}><Icon name="check" />Timed in</strong><p>Time In · 8:00 AM</p><span className={styles.successBadge}>Location recorded</span></div>
          <div className={styles.previewCard}><h3>Daily Work Log</h3><strong>Submitted</strong><p>Today’s learning, recorded.</p><span className={styles.neutralBadge}>Daily journal</span></div>
        </div>
        <div className={styles.activityCard}><div className={styles.activityTitle}><h3>This week’s attendance</h3><span>Hours rendered</span></div><div className={styles.week}>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => <div key={day}><span>{day}</span><b className={index < 4 ? styles.recordedDay : index === 4 ? styles.today : styles.emptyDay}>{index < 4 ? "8 h" : index === 4 ? "Today" : "—"}</b></div>)}</div></div>
        <div className={styles.taskRow}><Icon name="review" /><span>Tasks</span><span className={styles.pendingBadge}>In progress</span></div>
      </div>
    </div>
    <div className={styles.mobileCard}><div><Icon name="clock" /><strong>Today’s attendance</strong><span className={styles.mobileSample}>Example</span></div><dl><div><dt>Status</dt><dd>Timed in</dd></div><div><dt>Selfie evidence</dt><dd>Recorded</dd></div></dl><span className={styles.previewAction}>Time Out <Icon name="arrow" /></span></div>
    <figcaption id="preview-caption">Illustrative interface with sample records, not live internship data.</figcaption>
  </figure>;
}
