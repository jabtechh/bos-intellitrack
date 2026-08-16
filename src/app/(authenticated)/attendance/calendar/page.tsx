import {redirect} from "next/navigation";
export default async function LegacyAttendanceCalendar({searchParams}:{searchParams:Promise<{month?:string}>}){const{month}=await searchParams;redirect(`/calendar${month?`?month=${encodeURIComponent(month)}`:""}`)}
