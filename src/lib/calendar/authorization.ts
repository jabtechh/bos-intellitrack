import type { Prisma } from "@/generated/prisma/client";
import type { AnnouncementAudience } from "@/generated/prisma/enums";
import type { AnnouncementViewer } from "@/lib/announcements/authorization";

export function canManageCalendar(c: AnnouncementViewer) {
  return c.kind === "REPRESENTATIVE";
}

export function eventReaderWhere(c: AnnouncementViewer): Prisma.CalendarEventWhereInput {
  const roles:AnnouncementAudience[] =
    c.kind==="INTERN"?["ALL_USERS","INTERNS"]:
    c.kind==="SUPERVISOR"?["ALL_USERS","SUPERVISORS"]:
    c.kind==="COORDINATOR"?["ALL_USERS","COORDINATORS"]:
    ["ALL_USERS","REPRESENTATIVES"];
  const scoped:Prisma.CalendarEventWhereInput[]=[{audience:{in:roles}}];

  if(c.kind==="INTERN"&&c.companyId)scoped.push({audience:"COMPANY",companyId:c.companyId});
  if(c.kind==="SUPERVISOR"||c.kind==="REPRESENTATIVE")scoped.push({audience:"COMPANY",companyId:c.companyId});
  if(c.kind==="COORDINATOR"&&c.companyIds.length)scoped.push({audience:"COMPANY",companyId:{in:c.companyIds}});
  if(c.kind==="INTERN"||c.kind==="COORDINATOR")scoped.push({audience:"SCHOOL",schoolId:c.schoolId});

  return{status:"ACTIVE",OR:scoped};
}

export function eventManageWhere(c: AnnouncementViewer): Prisma.CalendarEventWhereInput {
  return c.kind==="REPRESENTATIVE"?{companyId:c.companyId}:{id:"00000000-0000-0000-0000-000000000000"};
}

export function holidayReaderWhere(c: AnnouncementViewer): Prisma.HolidayWhereInput {
  const conditions:Prisma.HolidayWhereInput[]=[{scope:"NATIONAL"}];
  if(c.kind==="INTERN"&&c.companyId)conditions.push({companyId:c.companyId});
  if(c.kind==="SUPERVISOR"||c.kind==="REPRESENTATIVE")conditions.push({companyId:c.companyId});
  if(c.kind==="COORDINATOR"&&c.companyIds.length)conditions.push({companyId:{in:c.companyIds}});
  return{isActive:true,OR:conditions};
}
