import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { Icon, type IconName } from "@/components/icons";
import { PageHeader } from "@/components/ui";
import { requireCurrentUser } from "@/lib/auth/require-current-user";

const groups:{title:string;items:{href:string;label:string;detail:string;icon:IconName}[]}[]=[
  {title:"Work",items:[{href:"/tasks",label:"Tasks",detail:"Assigned work and review status",icon:"review"},{href:"/evaluations",label:"Evaluations",detail:"Finalized results and guidance",icon:"journal"},{href:"/feedback",label:"Feedback",detail:"Constructive guidance and recognition",icon:"review"}]},
  {title:"Resources",items:[{href:"/documents",label:"Documents",detail:"Private internship records",icon:"journal"},{href:"/announcements",label:"Announcements",detail:"Main Office notices",icon:"bell"},{href:"/portfolio",label:"Portfolio",detail:"Recorded experience and evidence",icon:"journal"},{href:"/reports",label:"Reports",detail:"Verified internship reporting",icon:"review"},{href:"/insights",label:"Insights",detail:"Objective progress and activity",icon:"review"}]},
  {title:"Account",items:[{href:"/profile",label:"Profile",detail:"About, photos, and role context",icon:"users"},{href:"/attendance/corrections",label:"Corrections",detail:"Attendance correction requests",icon:"clock"}]},
];
export default async function MorePage(){const user=await requireCurrentUser();return <div className="operational-page"><PageHeader eyebrow="Workspace" title="More" description={`Quick access to ${user.firstName}'s development, resources, and account.`}/><div className="more-grid">{groups.map(group=><section className="ui-card more-section" key={group.title}><h2>{group.title}</h2><div>{group.items.map(item=><Link href={item.href} key={item.href}><span className="metric-icon"><Icon name={item.icon}/></span><span><strong>{item.label}</strong><small>{item.detail}</small></span><Icon name="arrow"/></Link>)}</div></section>)}</div><form action={logout} className="mt-5"><button className="button button-secondary text-destructive"><Icon name="logout"/>Sign out</button></form></div>}
