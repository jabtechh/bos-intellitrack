// DEC-2026-021 — on-screen Certificate of Completion (same content and layout as the PDF).
// `preview` renders the not-yet-issued version: watermarked, no number, no issue date, never downloadable.
import Image from "next/image";
import { certificateBody, certificateIssueDate } from "@/lib/certificates/domain";

export type CertificateSheetData = {
  certificateNumber: string | null; status: string; internName: string; positionTitle: string | null; companyName: string;
  startDate: Date; endDate: Date; creditedMinutes: number; requiredHours: number | null; issuedAt: Date | null; signatoryName: string; signatoryPosition: string;
};

export function CertificateSheet({ data, preview = false }: { data: CertificateSheetData; preview?: boolean }) {
  return <article className="certificate-sheet" aria-label={`${preview ? "Preview of the " : ""}Certificate of Completion for ${data.internName}`} data-certificate-status={preview ? "PREVIEW" : data.status}>
    <div className="certificate-inner">
      <Image src="/brand/bos-cup-mark.png" alt="Bo's Coffee" width={72} height={72} className="certificate-logo" />
      <p className="certificate-brand">Bo&apos;s Coffee</p>
      <h2 className="certificate-title">Certificate of Completion</h2>
      <span className="certificate-rule" aria-hidden="true" />
      <p className="certificate-lead">This certifies that</p>
      <p className="certificate-name">{data.internName}</p>
      <p className="certificate-body">{certificateBody(data)}</p>
      <div className="certificate-signatures">
        <div><small>Issued electronically by</small><strong>{data.signatoryName}</strong><span>{data.signatoryPosition}</span></div>
        <div><small>Date issued</small><strong>{data.issuedAt && !preview ? certificateIssueDate(data.issuedAt) : "Not yet issued"}</strong></div>
      </div>
      <div className="certificate-footer"><strong>{data.certificateNumber && !preview ? `Certificate No. ${data.certificateNumber}` : "Certificate No. assigned when issued"}</strong><span>Issued through IntelliTrack</span></div>
      {data.status === "REVOKED" && !preview ? <span className="certificate-revoked" aria-hidden="true">Revoked</span> : null}
      {preview ? <span className="certificate-revoked certificate-preview-mark" aria-hidden="true">Preview · Not yet issued</span> : null}
    </div>
  </article>;
}
