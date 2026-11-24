import Link from "next/link";
import { DashboardKpiCard, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export default async function SystemPage() {
  await requireAdmin();
  const [users, inactive] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: false } }),
  ]);
  return <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12">
    <PageHeader eyebrow="System Administrator" title="System" description="Technical account recovery and system-maintenance workspace. Business internship workflows are intentionally excluded." />
    <div className="metric-grid">
      <DashboardKpiCard label="User records" value={users} detail="Technical account directory" icon="users" />
      <DashboardKpiCard label="Inactive accounts" value={inactive} detail={inactive ? "Recovery review may be needed" : "No inactive accounts"} icon="review" tone={inactive ? "warning" : "success"} />
    </div>
    <div className="mt-4"><Link href="/admin/users" className="button button-secondary">Review users →</Link></div>
    <p className="mt-6 text-sm text-muted">Attendance review, Tasks, Evaluations, Documents, Announcements, Portfolio, Reports, and Company Operations are not routine System Administrator workflows.</p>
  </div>;
}
