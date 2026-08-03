import Link from "next/link";

const areas = [
  ["Schools", "Manage partner schools and coordinator organizations.", "/admin/schools"],
  ["Companies", "Manage internship companies, branches, and geofences.", "/admin/companies"],
  ["Users", "Invite users with controlled roles and organization profiles.", "/admin/users"],
] as const;

export default function AdminPage() {
  return <><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-700">Operations</p><h1 className="mt-2 font-heading text-4xl font-semibold text-brand-900">Administrator area</h1><div className="mt-8 grid gap-5 md:grid-cols-3">{areas.map(([title, description, href]) => <Link key={href} href={href} className="rounded-lg border border-border bg-surface p-6 shadow-surface"><h2 className="font-heading text-2xl font-semibold text-brand-900">{title}</h2><p className="mt-3 text-sm leading-6 text-secondary">{description}</p></Link>)}</div></>;
}
