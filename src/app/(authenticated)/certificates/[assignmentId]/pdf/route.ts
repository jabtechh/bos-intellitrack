// DEC-2026-021 — on-demand Certificate of Completion PDF (no PDF bytes are stored).
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { canDownloadCertificate } from "@/lib/certificates/domain";
import { certificateViewer, getCertificate } from "@/lib/certificates/data";
import { renderCertificatePdf } from "@/lib/certificates/pdf";
import { safePdfFilename } from "@/lib/reports/domain";

export async function GET(_request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const viewer = await certificateViewer();
  const { assignmentId } = await params;
  const certificate = await getCertificate(viewer, assignmentId);
  if (!certificate || !canDownloadCertificate(viewer.role, certificate.status)) return new NextResponse("Not found", { status: 404 });
  const logo = await readFile(path.join(process.cwd(), "public", "brand", "bos-cup-mark.png")).catch(() => undefined);
  const pdf = await renderCertificatePdf(certificate, logo ? new Uint8Array(logo) : undefined);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="' + safePdfFilename(certificate.internName + "-certificate-" + certificate.certificateNumber) + '"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
