import { NextResponse } from "next/server";
import { requirePortfolioViewer } from "@/lib/portfolio/authorization";
import { getInternReport, reportTotals } from "@/lib/reports/data";
import { createReportPdf } from "@/lib/reports/pdf";
import { reportPeriod, safePdfFilename } from "@/lib/reports/domain";
const d=(x:Date|null|undefined)=>x?x.toLocaleDateString("en-PH",{dateStyle:"medium",timeZone:"UTC"}):"Not available",h=(m:number|null)=>m==null?"Not available":`${Math.floor(m/60)}h ${m%60}m`,clock=(x:Date|null)=>x?x.toLocaleTimeString("en-PH",{hour:"numeric",minute:"2-digit",timeZone:"Asia/Manila"}):"--",friendly=(status:string,review:boolean)=>review?"Review needed":status==="APPROVED"?"Credited":status==="CLOCKED_IN"?"Clocked in":status.toLowerCase().replaceAll("_"," ");
export async function GET(request:Request,{params}:{params:Promise<{internId:string}>}) {
 const c=await requirePortfolioViewer(),{internId}=await params,url=new URL(request.url),period=reportPeriod({from:url.searchParams.get("from")??undefined,to:url.searchParams.get("to")??undefined});
 if("error" in period)return NextResponse.json({error:period.error},{status:400});
 const r=await getInternReport(c,internId,period);if(!r)return new NextResponse("Not found",{status:404});
 const t=reportTotals(r),name=`${r.internProfile.user.firstName} ${r.internProfile.user.lastName}`;
 const days=new Set(r.attendance.filter(x=>x.status==="APPROVED"&&x.creditedMinutes>0).map(x=>x.attendanceDate.toISOString().slice(0,10))).size,completion=t.requiredMinutes&&t.requiredMinutes>0?Math.round(t.creditedMinutes/t.requiredMinutes*100):null;
 const lines=["INTELLITRACK","BO'S COFFEE MAIN OFFICE","","INTERNSHIP PROGRESS REPORT",`Report date: ${d(new Date())}`,`Selected period: ${period.from?d(period.from):"Internship start"} to ${period.to?d(period.to):"Present"}`,"",`Intern: ${name}`,`Partner school: ${r.internProfile.school.name}`,`Internship dates: ${d(r.startDate)} to ${d(r.endDate)}`,"","HOURS SUMMARY",`Required Hours: ${h(t.requiredMinutes)}`,`Credited Hours: ${h(t.creditedMinutes)}`,`Remaining Hours: ${h(t.remainingMinutes)}`,`Completion: ${completion===null?"Not available":`${completion}%`}`,`Days Attended: ${days}`,"","ATTENDANCE LEDGER","Date | Clock In | Clock Out | Credited Hours | Status",...(r.attendance.length?r.attendance.map(x=>`${d(x.attendanceDate)} | ${clock(x.clockIn)} | ${clock(x.clockOut)} | ${x.status==="APPROVED"?h(x.creditedMinutes):"0h"} | ${friendly(x.status,x.reviewRequired)}`):["No eligible attendance records available."]),"",`TOTAL CREDITED HOURS: ${h(t.creditedMinutes)}`,`Generated: ${new Date().toLocaleString("en-PH",{timeZone:"Asia/Manila"})}`,"","IntelliTrack | Bo's Coffee Main Office","Private report - restricted evidence, file locations, credentials, Auth IDs, and internal identifiers are excluded."];
 const pdf=createReportPdf(lines);
 return new NextResponse(new Uint8Array(pdf),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${safePdfFilename(name)}"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
