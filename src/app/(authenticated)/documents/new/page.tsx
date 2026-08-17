import Link from "next/link";
import { uploadInternshipDocument } from "@/app/documents/actions";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { canManageDocuments, requireDocumentViewer } from "@/lib/documents/authorization";
import { CATEGORY_LABELS } from "@/lib/documents/domain";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";

export default async function NewDocument({ searchParams }: { searchParams: Promise<{ error?: string; title?: string; category?: string }> }) {
  const context = await requireDocumentViewer();
  const query = await searchParams;
  if (context.kind !== "INTERN" && !canManageDocuments(context)) return null;
  const assignments = canManageDocuments(context) ? await prisma.internshipAssignment.findMany({
    where: { status: "ACTIVE", ...(context.kind === "REPRESENTATIVE" ? { companyId: context.companyId } : { company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } }), internProfile: { user: { isActive: true } } },
    include: { internProfile: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } },
  }) : [];
  const category = query.category && query.category in CATEGORY_LABELS ? query.category : "INTERNSHIP_REQUIREMENT";
  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-3xl">
    <PageHeader eyebrow="Private document storage" title="Upload document" description={context.kind === "INTERN" ? "Submit a document for your internship record." : "Publish or manage a document for a selected active Intern."} />
    {query.error ? <p className="inline-notice" role="alert">{query.error}</p> : null}
    <form action={uploadInternshipDocument} className="ui-card space-y-6 p-5 sm:p-7">
      {canManageDocuments(context) ? <label className="field"><span>Intern</span><select name="internUserId" required><option value="">Select an Intern</option>{assignments.map((item) => <option key={item.id} value={item.internProfile.user.id}>{item.internProfile.user.firstName} {item.internProfile.user.lastName}</option>)}</select></label> : null}
      <label className="field"><span>Document title</span><input name="fileName" maxLength={255} defaultValue={query.title ?? ""} required /></label>
      <label className="field"><span>Category</span><select name="category" defaultValue={category}>{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="field"><span>Description (optional)</span><textarea name="description" rows={5} maxLength={5000} /></label>
      <label className="field"><span>File</span><input name="documentFile" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx" /><small>PDF, image, DOCX, or XLSX · maximum 25 MB</small></label>
      <div className="action-bar justify-end"><Link href="/documents" className="button button-secondary">Cancel</Link><button className="button button-primary">Upload securely</button></div>
    </form>
  </section></div>;
}
