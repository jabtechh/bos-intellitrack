export type CalendarAttendance={status:string;classification:string;corrections:{id:string}[]};
export type CalendarState="present"|"attention"|"scheduled"|"none";
export function attendanceCalendarState(record:CalendarAttendance|undefined,scheduled:boolean):CalendarState{if(record?.corrections.length||record?.status==="PENDING_REVIEW"||record?.status==="REJECTED"||record?.status==="INCOMPLETE")return"attention";if(record?.status==="APPROVED")return"present";if(record?.status==="CLOCKED_IN")return"attention";return scheduled?"scheduled":"none"}
export function attendanceCalendarLabel(state:CalendarState){return state==="present"?"Present":state==="attention"?"Needs attention":state==="scheduled"?"Scheduled":""}
export function calendarDayKey(value:Date){return value.toISOString().slice(0,10)}
export function calendarDays(start:Date,end:Date){const first=new Date(start),last=new Date(end),leading=(first.getUTCDay()+6)%7;first.setUTCDate(first.getUTCDate()-leading);last.setUTCDate(last.getUTCDate()+(7-((last.getUTCDay()+6)%7)-1));const values:Date[]=[];for(const cursor=new Date(first);cursor<=last;cursor.setUTCDate(cursor.getUTCDate()+1))values.push(new Date(cursor));return values}
