import { internshipAssignmentBaseSelect } from "@/lib/assignments/projection";
import Link from "next/link";
import { RecordsDataTable } from "@/components/records-data-table";
import { PageHeader } from "@/components/ui";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { prisma } from "@/lib/prisma";
import type { RecordRow, RecordTone } from "@/lib/tables/records";

const STATUS_TONE: Record<string, RecordTone> = { PENDING: "warning", APPROVED: "success", REJECTED: "danger", CANCELLED: "neutral" };

export default async function CorrectionsPage(){
  const user=await requireCurrentUser();
  const records=user.role==="INTERN"?await prisma.attendanceCorrection.findMany({where:{requestedById:user.id,attendance:{assignment:{internProfile:{userId:user.id}}}},orderBy:{createdAt:"desc"},include:{attendance:{include:{assignment:{select:{ ...internshipAssignmentBaseSelect, company:true}}}}}}):[];
  const rows:RecordRow[]=records.map(r=>{const tz=r.attendance.assignment.company.timezone;return{id:r.id,href:`/attendance/corrections/${r.id}`,cells:{
    date:{text:date(r.attendance.attendanceDate),sort:r.attendance.attendanceDate.getTime()},
    workplace:{text:"Bo’s Coffee Main Office"},
    original:{text:`${time(r.originalClockIn,tz)}–${time(r.originalClockOut,tz)}`},
    requested:{text:`${time(r.requestedClockIn,tz)}–${time(r.requestedClockOut,tz)}`},
    originalCredit:{text:duration(r.originalCreditedMinutes),sort:r.originalCreditedMinutes},
    requestedCredit:{text:r.requestedCreditedMinutes===null?"—":duration(r.requestedCreditedMinutes),sort:r.requestedCreditedMinutes??-1},
    status:{text:friendly(r.status),tone:STATUS_TONE[r.status]??"neutral"},
    created:{text:date(r.createdAt),sort:r.createdAt.getTime()},
    remarks:{text:r.reviewRemarks??"—"},
  }}});
  return <div className="operational-page"><PageHeader eyebrow="Attendance" title="Correction requests" description="Your requests to correct recorded attendance times or credited hours, and the Supervisor's decisions." actions={<Link href="/attendance/history" className="button button-secondary">Attendance history</Link>} />
    <RecordsDataTable caption="Correction requests" searchPlaceholder="Search date, status or remarks…" rows={rows} defaultSort={{key:"created",direction:"desc"}}
      filter={{key:"status",label:"Status",options:["Pending","Approved","Rejected","Cancelled"].map(value=>({value,label:value}))}}
      columns={[{key:"date",label:"Attendance date",primary:true},{key:"workplace",label:"Workplace"},{key:"original",label:"Original times",sortable:false},{key:"requested",label:"Requested times",sortable:false},{key:"originalCredit",label:"Original credit"},{key:"requestedCredit",label:"Requested credit"},{key:"status",label:"Status"},{key:"created",label:"Created"},{key:"remarks",label:"Reviewer remarks"}]}
      emptyTitle="No correction requests" emptyDescription="No correction requests have been submitted." />
  </div>;
}
function date(v:Date){return v.toLocaleDateString("en-PH",{dateStyle:"medium",timeZone:"UTC"})}function time(v:Date|null,tz:string){return v?v.toLocaleTimeString("en-PH",{hour:"numeric",minute:"2-digit",timeZone:tz}):"—"}function duration(v:number){return`${Math.floor(v/60)}h ${v%60}m`}
function friendly(v:string){return v.charAt(0)+v.slice(1).toLowerCase()}
