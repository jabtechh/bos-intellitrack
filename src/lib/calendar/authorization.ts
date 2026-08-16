import type {Prisma} from "@/generated/prisma/client";
import type {AnnouncementAudience} from "@/generated/prisma/enums";
import type {AnnouncementViewer} from "@/lib/announcements/authorization";
export function canManageCalendar(c:AnnouncementViewer){return c.kind==="ADMIN"||c.kind==="REPRESENTATIVE"}
export function eventReaderWhere(c:AnnouncementViewer):Prisma.CalendarEventWhereInput{const roles:AnnouncementAudience[]=c.kind==="INTERN"?["ALL_USERS","INTERNS"]:c.kind==="SUPERVISOR"?["ALL_USERS","SUPERVISORS"]:c.kind==="COORDINATOR"?["ALL_USERS","COORDINATORS"]:c.kind==="REPRESENTATIVE"?["ALL_USERS","REPRESENTATIVES"]:["ALL_USERS","ADMINISTRATORS"];const scoped:Prisma.CalendarEventWhereInput[]=[{audience:{in:roles}}];if("companyId"in c&&c.companyId)scoped.push({audience:"COMPANY",companyId:c.companyId});if("schoolId"in c)scoped.push({audience:"SCHOOL",schoolId:c.schoolId});return{status:"ACTIVE",OR:scoped}}
export function eventManageWhere(c:AnnouncementViewer):Prisma.CalendarEventWhereInput{return c.kind==="ADMIN"?{}:c.kind==="REPRESENTATIVE"?{companyId:c.companyId}:{id:"00000000-0000-0000-0000-000000000000"}}
export function holidayReaderWhere(c:AnnouncementViewer):Prisma.HolidayWhereInput{const conditions:Prisma.HolidayWhereInput[]=[{scope:"NATIONAL"}];if("companyId"in c&&c.companyId)conditions.push({companyId:c.companyId});return{isActive:true,OR:conditions}}
