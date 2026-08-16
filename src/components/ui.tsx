import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}<h1>{title}</h1>{description ? <p className="page-description">{description}</p> : null}</div>{actions ? <div className="action-bar">{actions}</div> : null}</header>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`ui-card ${className}`}>{children}</section>;
}

export function MetricCard({ label, value, detail, icon = "review" }: { label: string; value: ReactNode; detail?: string; icon?: IconName }) {
  return <div className="metric-card"><span className="metric-icon"><Icon name={icon} /></span><div><p>{label}</p><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</div></div>;
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  return <span className={`status-badge status-${tone}`}><span className="status-dot" aria-hidden="true"/>{children}</span>;
}
export function PriorityBadge({ children, level="normal" }: { children:ReactNode; level?:"low"|"normal"|"medium"|"high"|"urgent" }) { return <span className={`priority-badge priority-${level}`}>{children}</span>; }

export function SectionHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) { return <header className="section-header"><div><h2>{title}</h2>{description?<p>{description}</p>:null}</div>{actions?<div className="action-bar">{actions}</div>:null}</header>; }
export function SummaryStrip({ children, label="Summary" }: { children: ReactNode; label?: string }) { return <section className="summary-strip" aria-label={label}>{children}</section>; }
export function MetricItem({ label, value, detail }: { label:string; value:ReactNode; detail?:string }) { return <div className="metric-item"><span>{label}</span><strong>{value}</strong>{detail?<small>{detail}</small>:null}</div>; }
export function ProgressBar({ value, label }: { value:number; label:string }) { const safe=Math.min(100,Math.max(0,value));return <div className="progress-bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safe}><span style={{width:`${safe}%`}}/></div>; }
export function InlineNotice({ children, tone="info" }: { children:ReactNode; tone?:"info"|"success"|"warning"|"danger" }) { return <p className={`inline-notice notice-${tone}`} role={tone==="danger"?"alert":"status"}>{children}</p>; }
export function FilterBar({ children, label="Filters" }: { children:ReactNode; label?:string }) { return <div className="filter-bar" role="group" aria-label={label}>{children}</div>; }
export function FormActions({ children }: { children:ReactNode }) { return <div className="form-actions">{children}</div>; }

export function EmptyState({ title, description, action }: { title: string; description: string; action?: { href: string; label: string } }) {
  return <div className="empty-state"><span><Icon name="journal" /></span><h2>{title}</h2><p>{description}</p>{action ? <Link className="button button-primary" href={action.href}><Icon name="plus" />{action.label}</Link> : null}</div>;
}

export function ResponsiveRecordList({ children, label }: { children: ReactNode; label: string }) {
  return <section className="responsive-record-list" aria-label={label}>{children}</section>;
}

export function Skeleton({ className = "" }: { className?: string }) { return <span aria-hidden="true" className={`skeleton ${className}`} />; }

export function RouteSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="route-skeleton" role="status" aria-live="polite" aria-busy="true"><span className="sr-only">Loading page content</span><header className="skeleton-header"><div><Skeleton className="h-3 w-28" /><Skeleton className="mt-4 h-10 max-w-md" /><Skeleton className="mt-3 h-4 max-w-xl" /></div><Skeleton className="h-11 w-36" /></header><div className="skeleton-summary">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24" />)}</div><div className="skeleton-panel"><Skeleton className="h-5 w-44" />{Array.from({ length: rows }, (_, index) => <div className="skeleton-row" key={index}><Skeleton className="h-4 w-32"/><Skeleton className="h-4 w-full"/><Skeleton className="h-9 w-24"/></div>)}</div></div>;
}

export function Timeline({ items }: { items: { title: string; detail?: string; complete?: boolean }[] }) {
  return <ol className="timeline">{items.map((item, index) => <li key={`${item.title}-${index}`} className={item.complete ? "is-complete" : ""}><span>{item.complete ? <Icon name="check" /> : index + 1}</span><div><strong>{item.title}</strong>{item.detail ? <p>{item.detail}</p> : null}</div></li>)}</ol>;
}
