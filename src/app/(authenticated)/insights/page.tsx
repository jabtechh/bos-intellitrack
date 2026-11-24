import { redirect } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/ui";
import { insightAssignmentWhere, requireInsightsViewer } from "@/lib/insights/authorization";
import { prisma } from "@/lib/prisma";
import { listInsightInterns } from "@/lib/insights/data";

export default async function InsightsPage(){
  const context=await requireInsightsViewer();
  const rows=await listInsightInterns(context);
  const own=rows[0] ?? await prisma.internshipAssignment.findFirst({
    where: { ...insightAssignmentWhere(context), status: "COMPLETED" },
    select: { internProfile: { select: { userId: true } } },
    orderBy: { endDate: "desc" },
  });
  if(!own)return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl"><PageHeader eyebrow="Insights" title="Internship Insights" description="Explore your internship activity, skills, evaluations and verified progress in one place."/><section className="ui-card"><EmptyState title="Not enough data yet" description="Internship insights will appear when you have a recorded internship."/></section></section></div>;
  redirect(`/insights/${own.internProfile.userId}`);
}
