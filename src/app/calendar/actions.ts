"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnnouncementViewer } from "@/lib/announcements/authorization";
import { canManageCalendar, eventManageWhere } from "@/lib/calendar/authorization";
import { eventInputSchema, holidayInputSchema } from "@/lib/calendar/domain";
import { safelyFetchHolidayCandidates, UnconfiguredHolidayProvider } from "@/lib/calendar/holiday-provider";
import { timeOnReferenceDate } from "@/lib/organization/bo-coffee";
import { prisma } from "@/lib/prisma";

async function manager(){
  const c=await requireAnnouncementViewer();
  if(!canManageCalendar(c)||c.kind!=="REPRESENTATIVE")redirect("/calendar");
  return{c,companyId:c.companyId};
}

export async function createCalendarEvent(formData:FormData){
  const{c,companyId}=await manager(),parsed=eventInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if(!parsed.success)redirect("/calendar/manage?error=Review+the+event+details.");
  const x=parsed.data;
  await prisma.calendarEvent.create({data:{createdById:c.user.id,companyId,title:x.title,description:x.description??null,eventDate:new Date(`${x.eventDate}T00:00:00Z`),startTime:x.startTime?timeOnReferenceDate(x.startTime):null,endTime:x.endTime?timeOnReferenceDate(x.endTime):null,location:x.location??null,audience:x.audience,eventType:x.eventType}});
  revalidatePath("/calendar");redirect("/calendar/manage?created=event");
}
export async function cancelCalendarEvent(formData:FormData){
  const{c}=await manager(),id=String(formData.get("id"));
  await prisma.calendarEvent.updateMany({where:{id,...eventManageWhere(c)},data:{status:"CANCELLED"}});
  revalidatePath("/calendar");redirect("/calendar/manage");
}
export async function createHoliday(formData:FormData){
  const{c,companyId}=await manager(),parsed=holidayInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if(!parsed.success)redirect("/calendar/manage/holidays?error=Review+the+holiday+details.");
  const x=parsed.data;
  await prisma.holiday.create({data:{createdById:c.user.id,companyId:x.scope==="NATIONAL"?null:companyId,holidayDate:new Date(`${x.holidayDate}T00:00:00Z`),name:x.name,holidayType:x.holidayType,scope:x.scope,locality:x.locality??null,sourceReference:x.sourceReference??null,isManual:true}});
  revalidatePath("/calendar");redirect("/calendar/manage/holidays?created=1");
}
export async function disableHoliday(formData:FormData){
  const{companyId}=await manager(),id=String(formData.get("id"));
  await prisma.holiday.updateMany({where:{id,companyId},data:{isActive:false}});
  revalidatePath("/calendar");redirect("/calendar/manage/holidays");
}
export async function importPhilippineHolidays(formData:FormData){
  await manager();
  const year=Number(formData.get("year")),result=await safelyFetchHolidayCandidates(new UnconfiguredHolidayProvider(),year);
  redirect(`/calendar/manage/holidays?${result.error?"error="+encodeURIComponent(result.error):"imported="+result.items.length}`);
}
