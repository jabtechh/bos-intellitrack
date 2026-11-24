"use client";
// REQ-FR-ATT-9 / REQ-FR-REP-4 — staff analytics charts (inline SVG, no chart library).
// Categorical punctuality palette validated with the dataviz validator (light surface #ffffff): all checks pass;
// two hues sit below 3:1 contrast, so every chart has a legend/labels and a data-table view.
import { useState } from "react";
import { PUNCTUALITY, type ReportAnalytics } from "@/lib/reports/analytics-shared";

const SERIES: Record<(typeof PUNCTUALITY)[number], string> = { "On time": "#2a78d6", Late: "#eb6834", "Early departure": "#1baf7a", "Needs review": "#eda100" };
const BRAND = "#c28e46";
const W = 480, H = 230, PAD = { top: 14, right: 10, bottom: 30, left: 44 };
const PLOT_W = W - PAD.left - PAD.right, PLOT_H = H - PAD.top - PAD.bottom;

function niceMax(value: number) {
  if (value <= 0) return 4;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow * 4 >= value)! * pow;
  return step * 4;
}
const fmt = (n: number) => n.toLocaleString("en-PH", { maximumFractionDigits: 1 });

type Tip = { index: number; x: number; y: number } | null;

function Frame({ title, subtitle, children, table, legend }: { title: string; subtitle: string; children: React.ReactNode; table: React.ReactNode; legend?: React.ReactNode }) {
  return <section className="ui-card p-5" aria-label={title}>
    <h3 className="font-semibold text-foreground">{title}</h3>
    <p className="mt-1 text-xs text-muted">{subtitle}</p>
    {legend}
    <div className="relative mt-3">{children}</div>
    <details className="mt-3 text-sm"><summary className="cursor-pointer text-xs font-semibold text-secondary">Show data table</summary><div className="mt-2 overflow-x-auto">{table}</div></details>
  </section>;
}

function Axes({ max, labels, every = 2, format = fmt, min = 0 }: { max: number; labels: string[]; every?: number; format?: (n: number) => string; min?: number }) {
  const ticks = [0, 1, 2, 3, 4].map((i) => min + ((max - min) * i) / 4);
  const band = PLOT_W / labels.length;
  return <g fontSize="13" fill="var(--text-muted)">
    {ticks.map((t) => { const y = PAD.top + PLOT_H - ((t - min) / (max - min)) * PLOT_H; return <g key={t}><line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray={t === min ? undefined : "2 3"} /><text x={PAD.left - 6} y={y + 4} textAnchor="end">{format(t)}</text></g>; })}
    {labels.map((label, i) => (i % every === 0 || i === labels.length - 1) && !(i === labels.length - 2 && (labels.length - 1) % every !== 0) ? <text key={label + i} x={PAD.left + band * i + band / 2} y={H - 8} textAnchor="middle">{label}</text> : null)}
  </g>;
}

function Tooltip({ tip, children }: { tip: Tip; children: React.ReactNode }) {
  if (!tip) return null;
  return <div role="status" className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-lg" style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%` }}>{children}</div>;
}

/** Rounded data-end (top) anchored to the baseline. */
function Column({ x, y, width, height, color }: { x: number; y: number; width: number; height: number; color: string }) {
  if (height <= 0) return null;
  const r = Math.min(4, width / 2, height);
  return <path d={`M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`} fill={color} />;
}

function HitTargets({ count, onTip }: { count: number; onTip: (i: number | null) => void }) {
  const band = PLOT_W / count;
  return <g>{Array.from({ length: count }, (_, i) => <rect key={i} x={PAD.left + band * i} y={PAD.top} width={band} height={PLOT_H} fill="transparent" tabIndex={0} onMouseEnter={() => onTip(i)} onFocus={() => onTip(i)} onMouseLeave={() => onTip(null)} onBlur={() => onTip(null)} style={{ outline: "none" }} />)}</g>;
}

function SingleColumns({ labels, values, title, unit, describe }: { labels: string[]; values: number[]; title: string; unit: string; describe: (i: number) => React.ReactNode }) {
  const [tip, setTip] = useState<Tip>(null);
  const max = niceMax(Math.max(...values, 0));
  const band = PLOT_W / labels.length, barW = Math.max(6, Math.min(28, band * 0.6));
  return <>
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title}: ${labels.map((l, i) => `${l} ${fmt(values[i])} ${unit}`).join(", ")}`}>
      <Axes max={max} labels={labels} every={labels.length > 6 ? 2 : 1} />
      {values.map((v, i) => { const h = (v / max) * PLOT_H; const x = PAD.left + band * i + (band - barW) / 2; return <g key={i} opacity={tip && tip.index !== i ? 0.55 : 1}><Column x={x} y={PAD.top + PLOT_H - h} width={barW} height={h} color={BRAND} /></g>; })}
      <HitTargets count={labels.length} onTip={(i) => setTip(i === null ? null : { index: i, x: PAD.left + band * i + band / 2, y: PAD.top + PLOT_H - (values[i] / max) * PLOT_H - 6 })} />
    </svg>
    <Tooltip tip={tip}>{tip ? describe(tip.index) : null}</Tooltip>
  </>;
}

export function ReportAnalyticsPanel({ data, scopeLabel }: { data: ReportAnalytics; scopeLabel: string }) {
  const labels = data.weeks.map((w) => w.label);
  const [punctTip, setPunctTip] = useState<Tip>(null);
  const [scoreTip, setScoreTip] = useState<Tip>(null);
  const totals = data.weeks.map((w) => PUNCTUALITY.reduce((sum, p) => sum + w.punctuality[p], 0));
  const punctMax = niceMax(Math.max(...totals, 0));
  const band = PLOT_W / labels.length, barW = Math.max(6, Math.min(28, band * 0.6));
  const scores = data.weeks.map((w) => w.averageScore);
  const known = scores.filter((s): s is number => s !== null);
  // Round axis: the largest of 0/20/40/60/80 at least 5 points below the lowest score, so ticks fall on whole steps.
  const scoreMin = known.length ? [80, 60, 40, 20, 0].find((m) => m <= Math.min(...known) - 5) ?? 0 : 0, scoreMax = 100;
  const scoreY = (s: number) => PAD.top + PLOT_H - ((s - scoreMin) / (scoreMax - scoreMin)) * PLOT_H;
  const segments: string[] = []; let current = "";
  scores.forEach((s, i) => { const x = PAD.left + band * i + band / 2; if (s === null) { if (current) segments.push(current); current = ""; } else current += `${current ? "L" : "M"}${x},${scoreY(s)} `; });
  if (current) segments.push(current);
  const allPunct = PUNCTUALITY.map((p) => [p, data.weeks.reduce((sum, w) => sum + w.punctuality[p], 0)] as const);
  const punctTotal = allPunct.reduce((s, [, n]) => s + n, 0);
  const th = "px-2 py-1 text-left text-xs font-semibold text-secondary", td = "px-2 py-1 text-xs";

  if (!data.internCount) return null;
  return <section aria-labelledby="analytics-title" className="mb-6" data-report-analytics>
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 id="analytics-title" className="text-lg font-semibold text-foreground">Analytics</h2><p className="text-xs text-muted">{scopeLabel} · last {data.weeks.length} weeks · from verified records only</p></div></div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Frame title="Credited hours per week" subtitle="Approved Attendance only, all Interns in scope" table={<table className="w-full"><thead><tr><th className={th}>Week of</th><th className={th}>Credited hours</th></tr></thead><tbody>{data.weeks.map((w) => <tr key={w.start}><td className={td}>{w.label}</td><td className={td}>{fmt(w.creditedHours)}</td></tr>)}</tbody></table>}>
        <SingleColumns labels={labels} values={data.weeks.map((w) => w.creditedHours)} title="Credited hours per week" unit="hours" describe={(i) => <><strong className="block text-foreground">Week of {data.weeks[i].label}</strong>{fmt(data.weeks[i].creditedHours)} credited hours</>} />
      </Frame>

      <Frame title="Attendance punctuality per week" subtitle={punctTotal ? `${Math.round((allPunct[0][1] / punctTotal) * 100)}% on time across ${punctTotal} completed attendance days` : "No completed attendance days in this period"}
        legend={<ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-secondary" aria-label="Legend">{PUNCTUALITY.map((p) => <li key={p} className="flex items-center gap-1.5"><span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[p] }} />{p}</li>)}</ul>}
        table={<table className="w-full"><thead><tr><th className={th}>Week of</th>{PUNCTUALITY.map((p) => <th key={p} className={th}>{p}</th>)}</tr></thead><tbody>{data.weeks.map((w) => <tr key={w.start}><td className={td}>{w.label}</td>{PUNCTUALITY.map((p) => <td key={p} className={td}>{w.punctuality[p]}</td>)}</tr>)}</tbody></table>}>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Attendance punctuality per week. ${allPunct.map(([p, n]) => `${p} ${n}`).join(", ")}`}>
          <Axes max={punctMax} labels={labels} />
          {data.weeks.map((w, i) => {
            const x = PAD.left + band * i + (band - barW) / 2; let y = PAD.top + PLOT_H;
            const present = PUNCTUALITY.filter((p) => w.punctuality[p] > 0);
            return <g key={w.start} opacity={punctTip && punctTip.index !== i ? 0.55 : 1}>{present.map((p, k) => {
              const h = (w.punctuality[p] / punctMax) * PLOT_H; y -= h;
              const top = k === present.length - 1;
              const gap = k > 0 ? 2 : 0; // 2px surface gap between stacked segments
              return top ? <Column key={p} x={x} y={y} width={barW} height={h - gap} color={SERIES[p]} /> : <rect key={p} x={x} y={y} width={barW} height={Math.max(0, h - gap)} fill={SERIES[p]} />;
            })}</g>;
          })}
          <HitTargets count={labels.length} onTip={(i) => setPunctTip(i === null ? null : { index: i, x: PAD.left + band * i + band / 2, y: PAD.top + PLOT_H - (totals[i] / punctMax) * PLOT_H - 6 })} />
        </svg>
        <Tooltip tip={punctTip}>{punctTip ? <><strong className="block text-foreground">Week of {data.weeks[punctTip.index].label}</strong>{PUNCTUALITY.map((p) => <span key={p} className="flex items-center justify-between gap-3"><span className="flex items-center gap-1.5"><span aria-hidden className="inline-block h-2 w-2 rounded-sm" style={{ background: SERIES[p] }} />{p}</span><strong className="text-foreground">{data.weeks[punctTip.index].punctuality[p]}</strong></span>)}</> : null}</Tooltip>
      </Frame>

      <Frame title="Progress toward required hours" subtitle={`Interns by share of required hours credited${data.progressExcluded ? ` · ${data.progressExcluded} without required hours not shown` : ""}`} table={<table className="w-full"><thead><tr><th className={th}>Progress</th><th className={th}>Interns</th></tr></thead><tbody>{data.progress.map((p) => <tr key={p.bucket}><td className={td}>{p.bucket}</td><td className={td}>{p.interns}</td></tr>)}</tbody></table>}>
        <SingleColumns labels={data.progress.map((p) => p.bucket)} values={data.progress.map((p) => p.interns)} title="Progress toward required hours" unit="interns" describe={(i) => <><strong className="block text-foreground">{data.progress[i].bucket}</strong>{data.progress[i].interns} Intern{data.progress[i].interns === 1 ? "" : "s"}</>} />
      </Frame>

      <div className="grid gap-4">
        <section className="ui-card p-5" aria-label="Work Log compliance">
          <h3 className="font-semibold text-foreground">Work Log compliance</h3>
          <p className="mt-1 text-xs text-muted">Attended days that have a submitted Work Log</p>
          <strong className="mt-3 block text-4xl text-foreground">{data.workLogs.rate === null ? "—" : `${fmt(data.workLogs.rate)}%`}</strong>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]" aria-hidden><div className="h-full rounded-full" style={{ width: `${data.workLogs.rate ?? 0}%`, background: BRAND }} /></div>
          <p className="mt-2 text-xs text-secondary">{data.workLogs.withWorkLog} of {data.workLogs.attendedDays} attended days</p>
        </section>
        <Frame title="Average evaluation score" subtitle={known.length ? "Finalized Evaluations, weekly average (out of 100)" : "No finalized Evaluations in this period"} table={<table className="w-full"><thead><tr><th className={th}>Week of</th><th className={th}>Average</th><th className={th}>Evaluations</th></tr></thead><tbody>{data.weeks.map((w) => <tr key={w.start}><td className={td}>{w.label}</td><td className={td}>{w.averageScore === null ? "—" : fmt(w.averageScore)}</td><td className={td}>{w.evaluations}</td></tr>)}</tbody></table>}>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Average evaluation score per week: ${data.weeks.map((w) => `${w.label} ${w.averageScore ?? "none"}`).join(", ")}`}>
            <Axes max={scoreMax} min={scoreMin} labels={labels} format={(n) => String(Math.round(n))} />
            {scoreTip ? <line x1={PAD.left + band * scoreTip.index + band / 2} x2={PAD.left + band * scoreTip.index + band / 2} y1={PAD.top} y2={PAD.top + PLOT_H} stroke="var(--border-strong)" strokeWidth="1" /> : null}
            {segments.map((d) => <path key={d} d={d} fill="none" stroke={BRAND} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />)}
            {scores.map((s, i) => s === null ? null : <circle key={i} cx={PAD.left + band * i + band / 2} cy={scoreY(s)} r="4" fill={BRAND} stroke="var(--surface)" strokeWidth="2" />)}
            <HitTargets count={labels.length} onTip={(i) => setScoreTip(i === null ? null : { index: i, x: PAD.left + band * i + band / 2, y: scores[i] === null ? PAD.top + PLOT_H / 2 : scoreY(scores[i]!) - 8 })} />
          </svg>
          <Tooltip tip={scoreTip}>{scoreTip ? <><strong className="block text-foreground">Week of {data.weeks[scoreTip.index].label}</strong>{scores[scoreTip.index] === null ? "No finalized Evaluations" : `${fmt(scores[scoreTip.index]!)} average · ${data.weeks[scoreTip.index].evaluations} evaluation${data.weeks[scoreTip.index].evaluations === 1 ? "" : "s"}`}</> : null}</Tooltip>
        </Frame>
      </div>
    </div>
  </section>;
}
