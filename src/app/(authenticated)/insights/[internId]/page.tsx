import { notFound } from "next/navigation";
import { InsightDetail } from "@/components/insight-detail";
import { PageHeader } from "@/components/ui";
import { requireInsightsViewer } from "@/lib/insights/authorization";
import { isGeminiConfigured } from "@/lib/ai/config";
import { getInternInsights } from "@/lib/insights/data";
import { parseInsightPeriod } from "@/lib/insights/domain";

export default async function InternInsightsPage({params,searchParams}:{params:Promise<{internId:string}>;searchParams:Promise<{from?:string;to?:string}>}){
  const [context,{internId},query]=await Promise.all([requireInsightsViewer(),params,searchParams]);
  const parsed=parseInsightPeriod(query);
  if(!parsed.success)return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl"><PageHeader eyebrow="Insights" title="Choose a valid source period" description={parsed.error}/><form className="ui-card grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="field"><span>From</span><input type="date" name="from" defaultValue={parsed.values.from}/></label><label className="field"><span>To</span><input type="date" name="to" defaultValue={parsed.values.to}/></label><button className="button button-primary">Apply dates</button></form></section></div>;
  const insight=await getInternInsights(context,internId,parsed.period);
  if(!insight)notFound();
  return <InsightDetail insight={insight} period={parsed.period} values={parsed.values} internId={internId} aiEnabled={isGeminiConfigured()}/>;
}
