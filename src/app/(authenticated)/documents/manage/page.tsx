import { internshipAssignmentBaseSelect } from "@/lib/assignments/projection";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState,PageHeader,StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { canManageDocuments,documentWhere,requireDocumentViewer } from "@/lib/documents/authorization";
import { CATEGORY_LABELS,STATUS_LABELS } from "@/lib/documents/domain";

export default async function ManageDocuments(){
  const c=await requireDocumentViewer();
  if(!canManageDocuments(c))redirect("/documents");
  const rows=await prisma.document.findMany({
    where:documentWhere(c),
    include:{assignment:{select:{...internshipAssignmentBaseSelect,internProfile:{include:{user:{select:{firstName:true,lastName:true}}}}}}},
    orderBy:[{status:"asc"},{createdAt:"desc"}],
  });
  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl">
    <PageHeader eyebrow="Company Representative" title="Document review" description="Review Intern-submitted required documents. Routine document upload remains Intern-owned." />
    <section className="ui-card overflow-hidden">{rows.length?<div className="divide-y divide-border">{rows.map(row=><Link key={row.id} href={`/documents/${row.id}`} className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_13rem_11rem_auto] sm:items-center"><span><strong className="block">{row.fileName}</strong><small>{row.assignment.internProfile.user.firstName} {row.assignment.internProfile.user.lastName}</small></span><span>{CATEGORY_LABELS[row.category]}</span><span className="text-sm text-muted">{row.createdAt.toLocaleDateString("en-PH",{dateStyle:"medium"})}</span><StatusBadge tone={row.status==="APPROVED"?"success":row.status==="PENDING_REVIEW"?"warning":row.status==="REJECTED"?"danger":"neutral"}>{STATUS_LABELS[row.status]}</StatusBadge></Link>)}</div>:<EmptyState title="No internship documents" description="Intern-submitted documents in your company scope will appear here."/>}</section>
  </section></div>;
}
