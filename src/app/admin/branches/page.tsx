import { branchSchemaAvailable } from "@/lib/branches/compatibility";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { listBranches } from "@/lib/branches/service";
import { BranchForm } from "./branch-form";
import { metersToKmInput } from "@/lib/attendance/distance";

export default async function BranchesPage() {
  const branches = await listBranches();
  if (!await branchSchemaAvailable()) return <div className="operational-page"><PageHeader eyebrow="Company Operations" title="Branches" description="Branch setup is not initialized. Existing internships continue using their configured workplace and Attendance location." /></div>;
  return <div className="operational-page">
    <PageHeader eyebrow="Company Operations" title="Branches" description="Manage internship worksites and their attendance locations." />
    <details className="ui-card p-5"><summary className="min-h-11 cursor-pointer font-semibold">Add Branch</summary><div className="mt-4"><BranchForm /></div></details>
    {!branches.length ? <EmptyState title="No Branches yet" description="Add your first Branch to make it available during internship setup." /> : <div className="grid min-w-0 gap-4 lg:grid-cols-2">{branches.map(branch => <article key={branch.id} className="ui-card min-w-0 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="break-words font-heading text-xl font-semibold">{branch.name}</h2><StatusBadge tone={branch.isActive ? "success" : "neutral"}>{branch.isActive ? "Active" : "Inactive"}</StatusBadge></div>
      <p className="mt-3 break-words text-sm">Address: {branch.address}</p><p className="mt-2 text-sm text-secondary">{branch.latitude !== null && branch.longitude !== null ? "Attendance location configured" : "Attendance location not configured"}</p>
      <p className="mt-2 text-sm">{branch._count.assignments} Interns assigned</p>
      <details className="mt-4"><summary className="min-h-11 cursor-pointer font-semibold">Edit Branch</summary><BranchForm branch={{ id: branch.id, name: branch.name, address: branch.address, isActive: branch.isActive, latitude: branch.latitude?.toString() ?? "", longitude: branch.longitude?.toString() ?? "", geofenceRadiusMeters: metersToKmInput(branch.geofenceRadiusMeters) }} /></details>
    </article>)}</div>}
  </div>;
}
