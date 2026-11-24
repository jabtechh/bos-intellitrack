import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui";
import { SchoolsDataTable } from "@/components/schools-data-table";
import { requireCompanyOperationsManager } from "@/lib/auth/require-company-operations-manager";
import { prisma } from "@/lib/prisma";

export default async function SchoolsPage() {
  await requireCompanyOperationsManager();
  const schools = await prisma.school.findMany({
    orderBy: [{ name: "asc" }],
    select: { id: true, schoolCode: true, name: true, city: true, province: true, isActive: true },
  });
  return <div className="mx-auto w-full max-w-7xl space-y-6 px-5 py-7 sm:px-7 lg:px-8">
    <PageHeader
      eyebrow="Organizations"
      title="Partner Schools"
      description="Manage schools participating in the internship program."
      actions={<Link href="/admin/schools/new" className="button button-primary"><Icon name="plus"/>Add school</Link>}
    />
    <SchoolsDataTable schools={schools.map((school) => ({
      id: school.id,
      code: school.schoolCode ?? "",
      name: school.name,
      location: [school.city, school.province].filter(Boolean).join(", "),
      isActive: school.isActive,
    }))}/>
  </div>;
}
