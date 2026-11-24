import { internshipAssignmentBaseSelect } from "@/lib/assignments/projection";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import type { TaskStatus } from "@/generated/prisma/enums";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui";
import { RecordsDataTable } from "@/components/records-data-table";
import { SummaryBand } from "@/components/summary-band";
import type { RecordColumn, RecordRow } from "@/lib/tables/records";
import { prisma } from "@/lib/prisma";
import { requireTaskViewer, taskWhere } from "@/lib/tasks/authorization";
import { isOverdue, PRIORITY_LABELS, TASK_LABELS } from "@/lib/tasks/domain";
const filters=["active","submitted","completed","overdue","all"] as const;type Filter=typeof filters[number];
function tone(s:TaskStatus){return s==="COMPLETED"?"success":s==="SUBMITTED"||s==="IN_PROGRESS"?"info":s==="BLOCKED"||s==="REVISION_REQUESTED"?"warning":"neutral" as const}
export default async function Tasks({searchParams}:{searchParams:Promise<{filter?:string}>}){
  const c=await requireTaskViewer(),raw=(await searchParams).filter,filter:Filter=filters.includes(raw as Filter)?raw as Filter:"active",now=new Date();
  const status:Prisma.EnumTaskStatusFilter|undefined=filter==="submitted"?{in:["SUBMITTED"]}:filter==="completed"?{in:["COMPLETED"]}:filter==="active"?{notIn:["COMPLETED","CANCELLED"]}:undefined;
  const where:Prisma.TaskWhereInput={...taskWhere(c),...(status?{status}:{}),...(filter==="overdue"?{dueAt:{lt:now},status:{notIn:["COMPLETED","CANCELLED"]}}:{})};
  // DEC-2026-022: number banner; each tile is one of the existing filters, counted inside the same task scope.
  const open:Prisma.TaskWhereInput={status:{notIn:["COMPLETED","CANCELLED"]}};
  const [nActive,nSubmitted,nOverdue,nCompleted,nAll]=await Promise.all([
    prisma.task.count({where:{...taskWhere(c),...open}}),
    prisma.task.count({where:{...taskWhere(c),status:"SUBMITTED"}}),
    prisma.task.count({where:{...taskWhere(c),...open,dueAt:{lt:now}}}),
    prisma.task.count({where:{...taskWhere(c),status:"COMPLETED"}}),
    prisma.task.count({where:taskWhere(c)}),
  ]);
  const rows=await prisma.task.findMany({where,include:{assignment:{select:{ ...internshipAssignmentBaseSelect, internProfile:{include:{user:{select:{firstName:true,lastName:true}}}},supervisorProfile:{include:{user:{select:{firstName:true,lastName:true}}}}}}},orderBy:[{dueAt:"asc"},{createdAt:"desc"}]});
  const records:RecordRow[]=rows.map(row=>{const intern=row.assignment.internProfile.user;return{id:row.id,href:`/tasks/${row.id}`,cells:{
    title:{text:row.title},
    ...(c.kind!=="INTERN"?{intern:{text:`${intern.firstName} ${intern.lastName}`}}:{}),
    priority:{text:`${PRIORITY_LABELS[row.priority]}`},
    due:{text:`${row.dueAt?row.dueAt.toLocaleDateString("en-PH",{dateStyle:"medium",timeZone:"UTC"}):"No due date"}${isOverdue(row,now)?" · Overdue":""}`,sort:row.dueAt?row.dueAt.getTime():Number.MAX_SAFE_INTEGER},
    status:{text:TASK_LABELS[row.status],tone:tone(row.status)},
  }}});
  const columns:RecordColumn[]=[{key:"title",label:"Task",primary:true},...(c.kind!=="INTERN"?[{key:"intern",label:"Intern"}]:[]),{key:"priority",label:"Priority"},{key:"due",label:"Due"},{key:"status",label:"Status"}];
  return <div className="px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><section className="mx-auto max-w-6xl"><PageHeader eyebrow="Internship work" title="Tasks" description={c.kind==="INTERN"?"Track assigned work, progress, evidence, and review outcomes.":"Monitor scoped Intern tasks and their review state."} actions={c.kind==="SUPERVISOR"?<Link href="/tasks/new" className="button button-primary"><Icon name="plus"/>Assign task</Link>:undefined}/><SummaryBand label="Task summary" tiles={[
    {label:"Active",value:nActive,detail:"Open and in progress",tone:"info",href:"/tasks?filter=active",active:filter==="active"},
    {label:c.kind==="INTERN"?"Submitted for review":"Waiting for your review",value:nSubmitted,tone:"warning",href:"/tasks?filter=submitted",active:filter==="submitted"},
    {label:"Overdue",value:nOverdue,tone:nOverdue?"danger":"success",href:"/tasks?filter=overdue",active:filter==="overdue"},
    {label:"Completed",value:nCompleted,tone:"success",href:"/tasks?filter=completed",active:filter==="completed"},
    {label:"All Tasks",value:nAll,href:"/tasks?filter=all",active:filter==="all"},
  ]}/><RecordsDataTable caption="Tasks" rows={records} columns={columns} searchPlaceholder="Search tasks…" defaultSort={{key:"due",direction:"asc"}} filter={{key:"status",label:"Status",options:[...new Set(records.map(r=>r.cells.status.text))].map(value=>({value,label:value}))}} emptyTitle="No tasks in this view" emptyDescription="Tasks matching this status will appear here."/></section></div>
}
