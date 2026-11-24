import Link from "next/link";
import { redirect } from "next/navigation";
import { uploadInternshipDocument } from "@/app/documents/actions";
import { PageHeader } from "@/components/ui";
import { requireDocumentViewer } from "@/lib/documents/authorization";
import { CATEGORY_LABELS } from "@/lib/documents/domain";

export default async function NewDocument({ searchParams }: { searchParams: Promise<{ error?: string; title?: string; category?: string }> }) {
  const context = await requireDocumentViewer();
  if (context.kind !== "INTERN") redirect("/documents");
  const query = await searchParams;
  const category = query.category && query.category in CATEGORY_LABELS ? query.category : "INTERNSHIP_REQUIREMENT";
  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-3xl">
    <PageHeader eyebrow="Intern document submission" title="Upload document" description="Submit a required internship document for Company Representative review." />
    {query.error ? <p className="inline-notice" role="alert">{query.error}</p> : null}
    <form action={uploadInternshipDocument} className="ui-card space-y-6 p-5 sm:p-7">
      <label className="field"><span>Document title</span><input name="fileName" maxLength={255} defaultValue={query.title ?? ""} required /></label>
      <label className="field"><span>Category</span><select name="category" defaultValue={category}>{Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="field"><span>Description (optional)</span><textarea name="description" rows={5} maxLength={5000} /></label>
      <label className="field"><span>File</span><input name="documentFile" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx" /><small>PDF, image, DOCX, or XLSX · maximum 25 MB</small></label>
      <div className="action-bar justify-end"><Link href="/documents" className="button button-secondary">Cancel</Link><button className="button button-primary">Submit for review</button></div>
    </form>
  </section></div>;
}
