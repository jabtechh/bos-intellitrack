// DEC-2026-021 Amendment A — dashboard card: the certificate checklist, or the issued certificate.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ensureCertificateIssued } from "@/lib/certificates/auto";
import { loadCertificateEligibility } from "@/lib/certificates/issue";
import { CertificateChecklist } from "./certificate-checklist";
import { StatusBadge } from "./ui";

export async function CertificateProgressCard({ assignmentId }: { assignmentId: string }) {
  await ensureCertificateIssued(assignmentId); // issues automatically once all checks are met
  const [certificate, eligibility] = await Promise.all([
    prisma.internshipCertificate.findUnique({ where: { assignmentId }, select: { status: true, certificateNumber: true } }),
    loadCertificateEligibility(prisma, assignmentId),
  ]);
  if (!eligibility) return null;
  return <section className="ui-card p-5 sm:p-6" aria-labelledby="certificate-card-title" data-certificate-card={certificate ? certificate.status : "PREVIEW"}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="eyebrow">Certificate of Completion</p>
        <h2 id="certificate-card-title" className="mt-1 text-lg font-semibold text-foreground">{certificate?.status === "ISSUED" ? `Certificate No. ${certificate.certificateNumber}` : certificate ? "Certificate revoked" : "Not issued yet"}</h2>
        <p className="mt-1 text-sm text-secondary">{certificate?.status === "ISSUED" ? "Your certificate is ready. You can view and download it at any time." : certificate ? "Contact your Company Representative if you have questions." : "It is issued automatically when the three checks below are complete."}</p></div>
      <StatusBadge tone={certificate?.status === "ISSUED" ? "success" : certificate ? "danger" : "neutral"}>{certificate?.status === "ISSUED" ? "Issued" : certificate ? "Revoked" : "In progress"}</StatusBadge>
    </div>
    {!certificate ? <div className="mt-4"><CertificateChecklist eligibility={eligibility} compact /></div> : null}
    <div className="mt-4 flex flex-wrap gap-2">
      <Link href={`/certificates/${assignmentId}`} className={`button ${certificate?.status === "ISSUED" ? "button-primary" : "button-secondary"}`}>{certificate?.status === "ISSUED" ? "View certificate" : "Preview certificate"}</Link>
      {certificate?.status === "ISSUED" ? <a href={`/certificates/${assignmentId}/pdf`} className="button button-secondary">Download PDF</a> : null}
    </div>
  </section>;
}
