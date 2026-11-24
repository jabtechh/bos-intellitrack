import Image from "next/image";
import { Icon } from "@/components/icons";
import styles from "./landing.module.css";

const week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ProductPreview() {
  return <figure className={styles.productStage} aria-labelledby="preview-caption">
    <div className={styles.desktopDevice}>
      <div className={styles.browserChrome}><span className={styles.trafficLights} aria-hidden="true"><i /><i /><i /></span><span className={styles.windowTitle}>IntelliTrack / workspace</span><span className={styles.sampleTag}>Sample workspace</span></div>
      <div className={styles.workspaceCanvas}>
        <header className={styles.workspaceHeader}><span className={`${styles.workspaceAvatar} ${styles.monogram}`} aria-hidden="true"><Image src="/brand/bos-cup-mark.png" alt="" width={64} height={64} /></span><div><p>Intern workspace</p><h2>Your day, at a glance.</h2></div><span className={styles.workspaceContext}>Internship program<br /><b>Daily overview</b></span></header>
        <div className={styles.metricRow}>
          <section className={styles.sampleMetric}><h3>Internship Progress</h3><p className={styles.sampleValue}>120 <span>/ 240 h</span></p><div className={styles.sampleProgress} role="meter" aria-label="Illustrative internship progress" aria-valuemin={0} aria-valuemax={240} aria-valuenow={120}><span /></div><p className={styles.metricFootnote}>Hours rendered <b>50%</b></p></section>
          <section className={styles.sampleMetric}><h3>Attendance</h3><p className={styles.attendanceState}><span />Timed in</p><p className={styles.timeStamp}>Time In · 8:00 AM</p><span className={styles.verifiedChip}>Location recorded</span></section>
          <section className={styles.sampleMetric}><h3>Daily Work Log</h3><p className={styles.logState}>Submitted</p><p className={styles.timeStamp}>Today’s work, recorded.</p><span className={styles.journalChip}>Daily journal</span></section>
        </div>
        <section className={styles.weeklyRecord}><header><h3>Weekly Attendance</h3><span>Hours rendered</span></header><div className={styles.weekGrid}>{week.map((day,index)=><div key={day}><span>{day}</span><b className={index<4?styles.recorded:index===4?styles.currentDay:styles.noRecord}>{index<4?"8 h":index===4?"Today":"—"}</b></div>)}</div></section>
        <div className={styles.workspaceTask}><Icon name="review" /><span>Tasks</span><span className={styles.warningChip}>In progress</span><small>Work Logs &amp; daily work</small></div>
      </div>
    </div>
    <aside className={styles.evidenceDevice} aria-label="Illustrative attendance evidence"><header><span className={styles.evidenceDot} /><strong>Attendance evidence</strong><span>Sample</span></header><dl><div><dt>Current status</dt><dd>Timed in</dd></div><div><dt>Selfie evidence</dt><dd>Recorded <Icon name="check" /></dd></div><div><dt>Location evidence</dt><dd>Recorded</dd></div></dl><span className={styles.sampleTimeOut}>Time Out <Icon name="arrow" /></span></aside>
    <figcaption id="preview-caption">Illustrative interface with sample records, not live internship data.</figcaption>
  </figure>;
}
