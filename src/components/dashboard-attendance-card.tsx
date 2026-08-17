"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { StatusBadge } from "./ui";

type EvidenceState = "required" | "captured" | "verified" | "issue";
type AttendanceState = "not-started" | "clocked-in" | "completed" | "needs-review" | "incomplete";

export type DashboardAttendance = {
  id?: string;
  state: AttendanceState;
  dateLabel: string;
  scheduleLabel: string;
  clockIn?: string;
  clockInIso?: string;
  clockOut?: string;
  creditedMinutes?: number;
  workedMinutes?: number;
  evidence: { location: EvidenceState; selfie: EvidenceState };
  issue?: string;
};

export function DashboardAttendanceCard({ attendance }: { attendance: DashboardAttendance }) {
  const active = attendance.state === "clocked-in";
  const completed = attendance.state === "completed" || attendance.state === "needs-review";
  const tone = attendance.state === "completed" ? "success" : attendance.state === "needs-review" || attendance.state === "incomplete" ? "warning" : active ? "info" : "neutral";
  const label = attendance.state === "not-started" ? "Not started" : attendance.state === "clocked-in" ? "Clocked in" : attendance.state === "completed" ? "Completed" : attendance.state === "needs-review" ? "Needs review" : "Incomplete";

  return <article className="ui-card attendance-focus" data-attendance-state={attendance.state}>
    <div className="section-heading"><div><p className="eyebrow">Your day at Bo&apos;s Coffee</p><h2>Today&apos;s attendance</h2></div><StatusBadge tone={tone}>{label}</StatusBadge></div>
    <p className="attendance-context">{attendance.dateLabel} <span aria-hidden="true">·</span> Scheduled {attendance.scheduleLabel}</p>
    {active ? <div className="attendance-live-grid"><AttendanceValue label="Clock in" value={attendance.clockIn ?? "—"} /><AttendanceValue label="Time today" value={<ElapsedTime clockInIso={attendance.clockInIso!} />} /></div> : completed ? <div className="attendance-complete-grid"><AttendanceValue label="Clock in" value={attendance.clockIn ?? "—"} /><AttendanceValue label="Clock out" value={attendance.clockOut ?? "—"} /><AttendanceValue label={attendance.state === "needs-review" ? "Worked" : "Credited"} value={formatMinutes(attendance.state === "needs-review" ? attendance.workedMinutes ?? 0 : attendance.creditedMinutes ?? 0)} /></div> : attendance.state === "incomplete" ? <div className="attendance-live-grid"><AttendanceValue label="Clock in" value={attendance.clockIn ?? "—"} /><AttendanceValue label="Clock out" value="Missing" /></div> : <p className="attendance-ready">Location and selfie evidence will be requested when you clock in.</p>}
    {attendance.state === "needs-review" && attendance.issue ? <div className="attendance-issue" role="status"><Icon name="review" /><span><strong>{attendance.issue}</strong><small>Your attendance was recorded and is awaiting review.</small></span></div> : null}
    <EvidenceStrip location={attendance.evidence.location} selfie={attendance.evidence.selfie} />
    {attendance.state === "not-started" ? <Link href="/attendance" className="button button-primary attendance-primary"><Icon name="clock" />Clock in</Link> : active ? <Link href="/attendance" className="button button-primary attendance-primary"><Icon name="clock" />Clock out</Link> : attendance.state === "incomplete" ? <Link href={`/attendance/corrections/new${attendance.id ? `?attendance=${attendance.id}` : ""}`} className="button button-primary attendance-primary">Submit correction</Link> : attendance.id ? <Link href={`/attendance/${attendance.id}`} className="button button-secondary attendance-secondary">View details</Link> : null}
  </article>;
}

function AttendanceValue({ label, value }: { label: string; value: React.ReactNode }) { return <div><span>{label}</span><strong>{value}</strong></div>; }

export function ElapsedTime({ clockInIso }: { clockInIso: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const update = () => setElapsed(Math.max(0, Date.now() - new Date(clockInIso).getTime())); update(); const timer = window.setInterval(update, 1000); return () => window.clearInterval(timer); }, [clockInIso]);
  const seconds = Math.floor(elapsed / 1000), hours = Math.floor(seconds / 3600), minutes = Math.floor((seconds % 3600) / 60), remainder = seconds % 60;
  return <time className="elapsed-time" dateTime={`PT${hours}H${minutes}M${remainder}S`} aria-live="off">{hours}h {String(minutes).padStart(2, "0")}m {String(remainder).padStart(2, "0")}s</time>;
}

function EvidenceStrip({ location, selfie }: { location: EvidenceState; selfie: EvidenceState }) {
  return <div className="evidence-strip"><EvidenceItem kind="Location" state={location} /><EvidenceItem kind="Selfie" state={selfie} /><details className="evidence-info"><summary aria-label="About attendance evidence">i</summary><p>Valid location and selfie evidence is processed automatically. Attendance requiring attention is flagged for review.</p></details></div>;
}

function EvidenceItem({ kind, state }: { kind: string; state: EvidenceState }) { const symbol = state === "verified" || state === "captured" ? "✓" : state === "issue" ? "!" : "○"; const suffix = state === "verified" ? "verified" : state === "captured" ? "captured" : state === "issue" ? "issue" : "required"; return <span className={`evidence-${state}`}><b aria-hidden="true">{symbol}</b>{kind} {suffix}</span>; }
function formatMinutes(value: number) { return `${Math.floor(value / 60)}h ${String(value % 60).padStart(2, "0")}m`; }
