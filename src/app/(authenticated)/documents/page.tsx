import { internshipAssignmentBaseSelect } from "@/lib/assignments/projection";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { RecordsDataTable } from "@/components/records-data-table";
import { SummaryBand } from "@/components/summary-band";
import type { RecordRow } from "@/lib/tables/records";
import { prisma } from "@/lib/prisma";
import { canManageDocuments, documentWhere, requireDocumentViewer } from "@/lib/documents/authorization";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/documents/domain";

const tone = (status: keyof typeof STATUS_LABELS) => status === "APPROVED" ? "success" as const : status === "PENDING_REVIEW" ? "warning" as const : status === "REJECTED" ? "danger" as const : "neutral" as const;

export default async function Documents({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const c = await requireDocumentViewer();
  const q = await searchParams;
  const rows = await prisma.document.findMany({
    where: documentWhere(c),
    include: { assignment: { select: { ...internshipAssignmentBaseSelect, internProfile: { include: { user: { select: { firstName: true, lastName: true } } } } } }, uploadedBy: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
  const upload = c.kind === "INTERN" || canManageDocuments(c);
  const records: RecordRow[] = rows.map((row) => ({
    id: row.id,
    href: `/documents/${row.id}`,
    cells: {
      name: { text: row.fileName },
      person: { text: c.kind === "INTERN" ? `${row.uploadedBy.firstName} ${row.uploadedBy.lastName}` : `${row.assignment.internProfile.user.firstName} ${row.assignment.internProfile.user.lastName}` },
      category: { text: CATEGORY_LABELS[row.category] },
      date: { text: row.createdAt.toLocaleDateString("en-PH", { dateStyle: "medium" }), sort: row.createdAt.getTime() },
      status: { text: STATUS_LABELS[row.status], tone: tone(row.status) },
    },
  }));
  // DEC-2026-022: number banner; status tiles filter the table (same document scope).
  const count = (status: keyof typeof STATUS_LABELS) => rows.filter((row) => row.status === status).length;
  const selected = q.status && q.status in STATUS_LABELS ? STATUS_LABELS[q.status as keyof typeof STATUS_LABELS] : "";
  const link = (status?: keyof typeof STATUS_LABELS) => status ? `/documents?status=${status}` : "/documents";
  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl">
    <PageHeader eyebrow="Secure records" title="Documents" description="Authorized internship documents stored privately and shared through short-lived access." actions={upload ? <Link href="/documents/new" className="button button-primary">Upload document</Link> : undefined} />
    <SummaryBand label="Document summary" tiles={[
      { label: "All documents", value: rows.length, href: link(), active: !selected },
      { label: "Pending review", value: count("PENDING_REVIEW"), tone: count("PENDING_REVIEW") ? "warning" : "success", href: link("PENDING_REVIEW"), active: selected === STATUS_LABELS.PENDING_REVIEW },
      { label: "Approved", value: count("APPROVED"), tone: "success", href: link("APPROVED"), active: selected === STATUS_LABELS.APPROVED },
      { label: "Needs replacement", value: count("REJECTED"), tone: count("REJECTED") ? "danger" : "neutral", href: link("REJECTED"), active: selected === STATUS_LABELS.REJECTED },
    ]} />
    <RecordsDataTable key={selected} caption="Documents" rows={records} searchPlaceholder={c.kind === "INTERN" ? "Search document or category…" : "Search document, Intern or category…"}
      columns={[{ key: "name", label: "Document", primary: true }, { key: "person", label: c.kind === "INTERN" ? "Uploaded by" : "Intern" }, { key: "category", label: "Category" }, { key: "date", label: "Uploaded" }, { key: "status", label: "Status" }]}
      defaultSort={{ key: "date", direction: "desc" }} initialFilterValue={selected}
      filter={{ key: "status", label: "Status", options: Object.values(STATUS_LABELS).map((value) => ({ value, label: value })) }}
      emptyTitle="No documents available" emptyDescription="Authorized internship documents will appear here." />
  </section></div>;
}
