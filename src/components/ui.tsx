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
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: { href: string; label: string } }) {
  return <div className="empty-state"><span><Icon name="journal" /></span><h2>{title}</h2><p>{description}</p>{action ? <Link className="button button-primary" href={action.href}><Icon name="plus" />{action.label}</Link> : null}</div>;
}

export function Skeleton({ className = "" }: { className?: string }) { return <span aria-hidden="true" className={`skeleton ${className}`} />; }

export function RouteSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="route-skeleton" role="status" aria-live="polite"><span className="sr-only">Loading page content</span><Skeleton className="h-3 w-28" /><Skeleton className="mt-4 h-10 max-w-md" /><Skeleton className="mt-3 h-4 max-w-xl" /><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24" />)}</div><div className="ui-card mt-6 overflow-hidden p-5">{Array.from({ length: rows }, (_, index) => <Skeleton key={index} className="mb-4 h-14 last:mb-0" />)}</div></div>;
}

export function Timeline({ items }: { items: { title: string; detail?: string; complete?: boolean }[] }) {
  return <ol className="timeline">{items.map((item, index) => <li key={`${item.title}-${index}`} className={item.complete ? "is-complete" : ""}><span>{item.complete ? <Icon name="check" /> : index + 1}</span><div><strong>{item.title}</strong>{item.detail ? <p>{item.detail}</p> : null}</div></li>)}</ol>;
}
