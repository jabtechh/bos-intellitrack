// DEC-2026-021 — role-scoped list of Certificates of Completion.
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { RecordsDataTable } from "@/components/records-data-table";
import { certificateDate, hoursText } from "@/lib/certificates/domain";
import { certificateViewer, listCertificates } from "@/lib/certificates/data";
import { prisma } from "@/lib/prisma";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";

export const dynamic = "force-dynamic";

const DESCRIPTION: Record<string, string> = {
  INTERN: "Your Certificates of Completion. Each completed internship has its own certificate.",
  SUPERVISOR: "Certificates for interns you supervised.",
  COORDINATOR: "Certificates for students of your school.",
  REPRESENTATIVE: "Certificates issued for completed Main Office internships.",
};

export default async function CertificatesPage() {
  const viewer = await certificateViewer();
  const rows = await listCertificates(viewer);
  if (!rows) notFound(); // no certificate scope (for example the technical System Administrator)
  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-5xl">
    <PageHeader eyebrow="Completed internships" title="Certificates of Completion" description={DESCRIPTION[viewer.role] ?? ""} />
    <RecordsDataTable caption="Certificates" searchPlaceholder="Search name, position or certificate number…" defaultSort={{ key: "issued", direction: "desc" }}
      filter={{ key: "status", label: "Status", options: [{ value: "Issued", label: "Issued" }, { value: "Revoked", label: "Revoked" }] }}
      rows={rows.map((row) => ({ id: row.assignmentId, href: `/certificates/${row.assignmentId}`, cells: {
        name: { text: row.internName },
        position: { text: `${row.positionTitle ?? "Internship"} · ${row.companyName}` },
        period: { text: `${certificateDate(row.startDate)} – ${certificateDate(row.endDate)}`, sort: row.startDate.getTime() },
        hours: { text: `${hoursText(row.creditedMinutes)} h${row.requiredHours ? ` of ${row.requiredHours} h` : ""}`, sort: row.creditedMinutes },
        number: { text: row.certificateNumber, mono: true },
        issued: { text: certificateDate(row.issuedAt), sort: row.issuedAt.getTime() },
        status: { text: row.status === "ISSUED" ? "Issued" : "Revoked", tone: row.status === "ISSUED" ? "success" : "danger" },
      } }))}
      columns={[{ key: "name", label: "Intern", primary: true }, { key: "position", label: "Internship" }, { key: "period", label: "Period" }, { key: "hours", label: "Credited hours" }, { key: "number", label: "Certificate No." }, { key: "issued", label: "Issued" }, { key: "status", label: "Status" }]}
      emptyTitle="No certificates yet" emptyDescription="A Certificate of Completion is issued automatically once the required hours, a Work Log for every attended day and Getting started are complete." />
    {viewer.role === "INTERN" ? <InternPreviewLinks userId={viewer.userId} issued={rows.map((row) => row.assignmentId)} /> : null}
  </section></div>;
}

/** Interns can always open the preview of a certificate that is not issued yet. */
async function InternPreviewLinks({ userId, issued }: { userId: string; issued: string[] }) {
  const pending = await prisma.internshipAssignment.findMany({
    where: { status: { in: ["ACTIVE", "COMPLETED"] }, internProfile: { userId }, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true }, id: { notIn: issued } },
    select: { id: true, positionTitle: true, status: true }, orderBy: { startDate: "desc" },
  });
  if (!pending.length) return null;
  return <section className="mt-6"><h2 className="font-semibold text-foreground">Not issued yet</h2><ul className="mt-3 grid gap-3 md:grid-cols-2">{pending.map((row) => <li key={row.id} className="ui-card p-5"><p className="font-semibold">{row.positionTitle ?? "Internship"}</p><p className="mt-1 text-sm text-secondary">{row.status === "ACTIVE" ? "Current internship" : "Completed internship"} · see what is left before your certificate is issued.</p><Link href={`/certificates/${row.id}`} className="button button-secondary mt-3">Preview certificate</Link></li>)}</ul></section>;
}
