import { NextResponse, type NextRequest } from "next/server";
import { requirePortfolioViewer } from "@/lib/portfolio/authorization";
import { getPortfolioSource } from "@/lib/portfolio/source";
import { defaultPortfolioTitle } from "@/lib/portfolio/snapshot";
import { portfolioPdfLines } from "@/lib/portfolio/pdf";
import { createReportPdf } from "@/lib/reports/pdf";
import { safePdfFilename } from "@/lib/reports/domain";

// DEC-2026-020: an assignment-specific Portfolio PDF, generated on demand (no PDF bytes are stored).
// `?assignment=` is only a candidate and is re-authorized for the signed-in Intern; without it the
// default Portfolio (active internship, else the latest completed one) is exported.
export async function GET(request: NextRequest) {
  const context = await requirePortfolioViewer();
  const candidate = request.nextUrl.searchParams.get("assignment");
  const source = await getPortfolioSource(context, candidate);
  if (!source) return new NextResponse("No eligible internship record", { status: 404 });

  const { report, assignment } = source;
  const name = report.internProfile.user.firstName + " " + report.internProfile.user.lastName;
  const lines = portfolioPdfLines({
    internName: name,
    schoolName: report.internProfile.school.name,
    companyName: assignment.company.name,
    positionTitle: assignment.positionTitle,
    mode: source.mode,
    snapshotCompletedAt: source.snapshot?.completedAt ?? null,
    evidence: source.evidence,
    portfolio: assignment.portfolio,
    defaultTitle: defaultPortfolioTitle(assignment.positionTitle),
    generatedAt: new Date(),
  });

  const pdf = await createReportPdf(lines);
  const period = assignment.startDate.toISOString().slice(0, 7);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="' + safePdfFilename(name + "-portfolio-" + period) + '"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
