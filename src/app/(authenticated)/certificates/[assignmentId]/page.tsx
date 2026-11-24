// DEC-2026-021 — Certificate of Completion: issued certificate (view/download, Representative revoke) or,
// for the intern before all checks are met, a watermarked preview with the checklist (no download).
import Link from "next/link";
import { notFound } from "next/navigation";
import { CertificateChecklist } from "@/components/certificate-checklist";
import { CertificateSheet } from "@/components/certificate-sheet";
import { PageHeader } from "@/components/ui";
import { RevokeCertificateForm } from "@/app/certificates/revoke-form";
import { ensureCertificateIssued } from "@/lib/certificates/auto";
import { canDownloadCertificate, canRevokeCertificate, certificateIssueDate } from "@/lib/certificates/domain";
import { certificateViewer, getCertificate, ownInternshipForCertificate } from "@/lib/certificates/data";
import { ORGANIZATION_SIGNATORY_POSITION } from "@/lib/certificates/eligibility";
import { loadCertificateEligibility } from "@/lib/certificates/issue";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CertificatePage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const viewer = await certificateViewer();
  const { assignmentId } = await params;
  let certificate = await getCertificate(viewer, assignmentId);

  if (!certificate && viewer.role === "INTERN") {
    const own = await ownInternshipForCertificate(viewer.userId, assignmentId);
    if (!own) notFound();
    // Issue automatically the moment all checks are met; otherwise show the preview.
    await ensureCertificateIssued(own.id);
    certificate = await getCertificate(viewer, assignmentId);
    if (!certificate) {
      const eligibility = await loadCertificateEligibility(prisma, own.id);
      if (!eligibility) notFound();
      const user = own.internProfile.user;
      return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-5xl">
        <PageHeader eyebrow="Certificate of Completion · Preview" title="Your certificate is not issued yet"
          description="This is a preview. Finish the checklist below and your certificate is issued automatically, ready to view and download."
          actions={<Link href={`/portfolio?assignment=${own.id}`} className="button button-secondary">Back to Portfolio</Link>} />
        <CertificateChecklist eligibility={eligibility} />
        <div className="mt-5"><CertificateSheet preview data={{
          certificateNumber: null, status: "PREVIEW", internName: [user.firstName, user.middleName, user.lastName, user.suffix].filter((part) => part && part.trim()).join(" "),
          positionTitle: own.positionTitle, companyName: own.company.name, startDate: own.startDate, endDate: own.endDate,
          creditedMinutes: eligibility.hours.creditedMinutes, requiredHours: own.requiredHours, issuedAt: null,
          signatoryName: own.company.name, signatoryPosition: ORGANIZATION_SIGNATORY_POSITION,
        }} /></div>
        <p className="mt-4 text-xs text-muted">The preview cannot be downloaded. Hours are credited from approved Attendance records only.</p>
      </section></div>;
    }
  }
  if (!certificate) notFound();

  const revoked = certificate.status === "REVOKED";
  const download = canDownloadCertificate(viewer.role, certificate.status);
  const back = viewer.role === "INTERN" ? { href: `/portfolio?assignment=${certificate.assignmentId}`, label: "Back to Portfolio" } : { href: "/certificates", label: "All certificates" };

  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-5xl">
    <PageHeader eyebrow="Certificate of Completion" title={certificate.internName}
      description={`${certificate.positionTitle ?? "Internship"} · ${certificate.companyName} · Certificate No. ${certificate.certificateNumber}`}
      actions={<><Link href={back.href} className="button button-secondary">{back.label}</Link>{download ? <a href={`/certificates/${certificate.assignmentId}/pdf`} className="button button-primary">Download PDF</a> : null}</>} />
    {revoked ? <p role="status" className="inline-notice notice-danger mb-5">This certificate was revoked on {certificateIssueDate(certificate.revokedAt!)}{viewer.role === "INTERN" ? ". Contact your Company Representative if you have questions." : `: ${certificate.revokeReason}`}</p> : null}
    <CertificateSheet data={certificate} />
    <p className="mt-4 text-xs text-muted">Issued automatically once the required hours, a Work Log for every attended day and Getting started were complete. Hours are credited from approved Attendance records only. No handwritten signature is reproduced.</p>
    {canRevokeCertificate(viewer.role) && !revoked ? <RevokeCertificateForm assignmentId={certificate.assignmentId} /> : null}
  </section></div>;
}
