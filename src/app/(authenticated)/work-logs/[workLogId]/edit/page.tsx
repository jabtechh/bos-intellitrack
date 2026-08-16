import { notFound } from "next/navigation";
import { updateWorkLog } from "@/app/work-logs/actions";
import { WorkLogForm } from "@/app/work-logs/work-log-form";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { canEditWorkLog } from "@/lib/work-logs/domain";
import { prisma } from "@/lib/prisma";
export default async function Edit({params,searchParams}:{params:Promise<{workLogId:string}>;searchParams:Promise<{error?:string}>}){const user=await requireCurrentUser(),{workLogId}=await params;const row=await prisma.workLog.findFirst({where:{id:workLogId,assignment:{internProfile:{userId:user.id}}},include:{assignment:{select:{company:{select:{timezone:true}}}}}});if(!row||!canEditWorkLog(row.status))notFound();const attendanceRow=await prisma.attendance.findUnique({where:{assignmentId_attendanceDate:{assignmentId:row.assignmentId,attendanceDate:row.workDate}}});const attendance=attendanceRow?{clockIn:time(attendanceRow.clockIn,row.assignment.company.timezone),clockOut:time(attendanceRow.clockOut,row.assignment.company.timezone),creditedMinutes:attendanceRow.creditedMinutes}:null;return <main className="journal-page"><header><p className="eyebrow">Draft journal</p><h1>Edit Daily Work Log</h1><p>Finish your entry, then submit it as your completed daily record.</p></header><WorkLogForm action={updateWorkLog} record={row} error={(await searchParams).error} attendance={attendance}/></main>}
function time(value:Date|null,zone:string){return value?value.toLocaleTimeString("en-PH",{hour:"numeric",minute:"2-digit",timeZone:zone}):null}
