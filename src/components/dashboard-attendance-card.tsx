"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { StatusBadge } from "./ui";
import styles from "./intern-dashboard.module.css";

type EvidenceState = "required" | "captured" | "verified" | "issue";
type AttendanceState = "not-started" | "clocked-in" | "completed" | "needs-review" | "incomplete";
export type DashboardAttendance = {
  id?: string; state: AttendanceState; dateLabel: string; scheduleLabel: string;
  clockIn?: string; clockInIso?: string; clockOut?: string; nowIso?: string;
  creditedMinutes?: number; workedMinutes?: number; workplace?: string; selfieUrl?: string | null;
  evidence: { location: EvidenceState; selfie: EvidenceState }; issue?: string; pendingCorrection?: boolean;
};

export function DashboardAttendanceCard({ attendance }: { attendance: DashboardAttendance }) {
  const active = attendance.state === "clocked-in";
  const completed = attendance.state === "completed";
  const needsAttention = attendance.state === "needs-review" || attendance.state === "incomplete";
  const label = active ? "Timed in" : completed ? "Completed" : attendance.state === "needs-review" ? "Exception" : attendance.state === "incomplete" ? "Incomplete" : "Not started";
  return <section className={`ui-card ${styles.attendance}`} data-attendance-state={attendance.state} aria-labelledby="daily-attendance-title">
    <header className={styles.sectionHeader}><div className={styles.sectionIdentity}><span className={styles.sectionIcon}><Icon name="clock" /></span><div><p className={styles.eyebrow}>Your daily workspace</p><h2 id="daily-attendance-title">Today&apos;s Attendance</h2></div></div><StatusBadge tone={needsAttention ? "warning" : active || completed ? "success" : "neutral"}>{label}</StatusBadge></header>
    <p className={styles.attendanceContext}>{attendance.dateLabel} <span aria-hidden="true">·</span> Scheduled {attendance.scheduleLabel}</p>
    <div className={styles.attendanceBody}>
      <div className={styles.evidencePanel}>
        {attendance.selfieUrl ? <Image className={styles.selfie} src={attendance.selfieUrl} alt="Your captured Time In selfie" width={72} height={88} unoptimized /> : <span className={styles.evidencePlaceholder} aria-hidden="true"><Icon name="users" /></span>}
        <div><strong>{attendance.workplace ?? "Assigned workplace"}</strong><EvidenceStrip location={attendance.evidence.location} selfie={attendance.evidence.selfie} />{attendance.clockInIso ? <small>Time In captured {attendance.clockIn}</small> : <small>Evidence is requested during Time In.</small>}</div>
      </div>
      <div className={styles.timePanel}>
        {active ? <><p className={styles.eyebrow}>Time rendered today</p>{attendance.clockInIso ? <ElapsedTime clockInIso={attendance.clockInIso} nowIso={attendance.nowIso} /> : <strong>—</strong>}<span className={styles.timeNote}>Live elapsed time · credited hours come from Attendance</span><dl><AttendanceValue label="Time In" value={attendance.clockIn ?? "—"} /><AttendanceValue label="Time Out" value="Not yet recorded" /></dl></> : completed ? <dl className={styles.completedFacts}><AttendanceValue label="Time In" value={attendance.clockIn ?? "—"} /><AttendanceValue label="Time Out" value={attendance.clockOut ?? "—"} /><AttendanceValue label="Hours rendered" value={formatMinutes(attendance.creditedMinutes ?? 0)} /></dl> : needsAttention ? <><p className={styles.eyebrow}>Record needs attention</p><dl><AttendanceValue label="Time In" value={attendance.clockIn ?? "—"} /><AttendanceValue label="Time Out" value={attendance.clockOut ?? "Missing"} /></dl><p className={styles.timeNote}>{attendance.issue ?? "Open the record to review the missing or flagged evidence."}</p></> : <><h3>Not timed in yet.</h3><p>Capture your location and a fresh selfie to start today&apos;s attendance.</p></>}
      </div>
      <div className={styles.attendanceActions}>
        {attendance.state === "not-started" ? <Link href="/attendance" className="button button-primary"><Icon name="clock" />Time In</Link> : active ? <Link href="/attendance" className="button button-primary"><Icon name="clock" />Time Out</Link> : attendance.id ? <Link href={`/attendance/${attendance.id}`} className="button button-secondary">View Attendance Details <Icon name="arrow" /></Link> : null}
        {attendance.state === "incomplete" && attendance.id && !attendance.pendingCorrection ? <Link href={`/attendance/corrections/new?attendance=${attendance.id}`} className="text-link">Request correction</Link> : null}
        {attendance.pendingCorrection ? <Link href="/attendance/corrections" className="text-link">Correction awaiting review</Link> : null}
      </div>
    </div>
  </section>;
}
function AttendanceValue({ label, value }: { label: string; value: React.ReactNode }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
export function ElapsedTime({ clockInIso, nowIso }: { clockInIso: string; nowIso?: string }) {
  const [elapsed, setElapsed] = useState(() => nowIso ? Math.max(0, Date.parse(nowIso) - Date.parse(clockInIso)) : 0);
  useEffect(() => { const update = () => setElapsed(Math.max(0, Date.now() - new Date(clockInIso).getTime())); update(); const timer = window.setInterval(update, 1000); return () => window.clearInterval(timer); }, [clockInIso]);
  if (!Number.isFinite(elapsed)) return <span>Time unavailable</span>;
  const seconds = Math.floor(elapsed / 1000), hours = Math.floor(seconds / 3600), minutes = Math.floor((seconds % 3600) / 60), remainder = seconds % 60;
  return <time className={styles.elapsedTime} dateTime={`PT${hours}H${minutes}M${remainder}S`} aria-live="off">{String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(remainder).padStart(2, "0")}</time>;
}
function EvidenceStrip({ location, selfie }: { location: EvidenceState; selfie: EvidenceState }) {
  return <div className={styles.evidenceStrip}><EvidenceItem kind="Location" state={location} /><EvidenceItem kind="Selfie" state={selfie} /><details className="evidence-info"><summary aria-label="About attendance evidence">i</summary><p>Location and selfie evidence are recorded with Attendance. Flagged or missing evidence requires attention. This does not verify identity.</p></details></div>;
}
function EvidenceItem({ kind, state }: { kind: string; state: EvidenceState }) {
  const label = state === "required" ? `${kind} required` : state === "issue" ? `${kind} needs attention` : kind === "Selfie" ? "Selfie captured" : state === "verified" ? "Within recorded geofence" : "Location recorded";
  return <span className={state === "issue" ? styles.evidenceWarning : state === "required" ? styles.evidenceMuted : styles.evidenceSuccess}><Icon name={state === "issue" ? "alert" : "check"} />{label}</span>;
}
function formatMinutes(value: number) { return `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, "0")}m`; }
