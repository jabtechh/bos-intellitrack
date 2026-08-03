import Link from "next/link";

import { logout } from "@/app/(auth)/actions";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <div className="min-h-screen bg-canvas">
    <header className="border-b border-stone-700 bg-brand-900 text-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-5 px-5 py-4 sm:px-8">
      <Link href="/admin" className="font-heading text-xl font-semibold">IntelliTrack Admin</Link>
      <nav aria-label="Administrator" className="flex flex-1 flex-wrap gap-4 text-sm"><Link href="/admin/schools">Schools</Link><Link href="/admin/companies">Companies</Link><Link href="/admin/users">Users</Link><Link href="/dashboard">Dashboard</Link></nav>
      <span className="text-sm text-stone-300">{user.firstName} {user.lastName}</span><form action={logout}><button className="rounded-md border border-stone-500 px-3 py-2 text-sm">Sign out</button></form>
    </div></header><main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">{children}</main>
  </div>;
}
