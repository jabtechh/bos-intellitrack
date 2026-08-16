/* eslint-disable @next/next/no-img-element -- Private short-lived signed profile URLs are not suitable for shared optimization caches. */
import Link from "next/link";
import { roleLabel } from "@/lib/auth/roles";
import { TYPE_LABELS } from "@/lib/evaluations/domain";
import type { getProfile } from "@/lib/profile/data";
import { initials } from "@/lib/profile/domain";
import { recordedSkills } from "@/lib/insights/domain";

type Profile=NonNullable<Awaited<ReturnType<typeof getProfile>>>;
const date=(value:Date)=>value.toLocaleDateString("en-PH",{dateStyle:"medium",timeZone:"UTC"});
const hours=(value:number)=>Number.isInteger(value)?String(value):value.toFixed(1);

export function ProfileView({profile,isOwn}:{profile:Profile;isOwn:boolean}){
  const name=[profile.firstName,profile.middleName,profile.lastName,profile.suffix].filter(Boolean).join(" ");
  const internship=profile.internship,credited=internship?Number(internship.renderedHours):0,remaining=internship?.requiredHours==null?null:Math.max(internship.requiredHours-credited,0);
  const skills=internship?recordedSkills([internship.portfolio?.skills,...internship.workLogs.map(item=>item.skillsApplied)]):[];
  return <div className="profile-page"><section className="profile-hero ui-card">
    <div className="profile-cover" style={profile.coverUrl?{backgroundImage:`url(${JSON.stringify(profile.coverUrl).slice(1,-1)})`}:undefined}/>
    <div className="profile-identity">
      <div className="profile-avatar-lg">{profile.avatarUrl?<img src={profile.avatarUrl} alt=""/>:<span>{initials(profile.firstName,profile.lastName)}</span>}</div>
      <div><h1>{name}</h1><p>{roleLabel(profile.role)}</p></div>
      {isOwn?<Link href="/profile/edit" className="button button-primary">Edit profile</Link>:null}
    </div>
  </section>
  {isOwn?<nav className="profile-shortcuts" aria-label="Profile shortcuts"><Link href="/dashboard">Dashboard</Link>{profile.role==="INTERN"?<Link href="/portfolio">Portfolio</Link>:null}<Link href="/reports">Reports</Link><Link href="/insights">Insights</Link></nav>:null}
  <div className="profile-layout">
    <aside className="space-y-5"><Card title="About"><p className="profile-copy">{profile.bio||"No About information has been added yet."}</p>{isOwn&&profile.phoneNumber?<Item label="Phone" value={profile.phoneNumber}/>:null}</Card><RoleContext profile={profile}/></aside>
    <main className="space-y-5">{internship?<InternshipProfile profile={profile} skills={skills} credited={credited} remaining={remaining} isOwn={isOwn}/>:<RoleActivity profile={profile}/>}</main>
  </div></div>;
}

function RoleContext({profile}:{profile:Profile}){
  if(profile.internProfile)return <Card title="Internship context"><Item label="Partner school" value={profile.internProfile.school.name}/><Item label="Program" value={[profile.internProfile.course,profile.internProfile.yearLevel].filter(Boolean).join(" · ")}/></Card>;
  if(profile.supervisorProfile)return <Card title="Work context"><Item label="Role" value={profile.supervisorProfile.position}/><Item label="Workplace" value="Bo’s Coffee Main Office"/>{profile.supervisorProfile.department?<Item label="Department" value={profile.supervisorProfile.department}/>:null}</Card>;
  if(profile.coordinatorProfile)return <Card title="School context"><Item label="Partner school" value={profile.coordinatorProfile.school.name}/><Item label="Role" value={profile.coordinatorProfile.position}/>{profile.coordinatorProfile.department?<Item label="Department" value={profile.coordinatorProfile.department}/>:null}</Card>;
  if(profile.representativeProfile)return <Card title="Work context"><Item label="Role" value={profile.representativeProfile.position}/><Item label="Workplace" value="Bo’s Coffee Main Office"/>{profile.representativeProfile.department?<Item label="Department" value={profile.representativeProfile.department}/>:null}</Card>;
  return <Card title="Work context"><Item label="Role" value={profile.adminProfile?.designation||"System administration"}/><Item label="Workplace" value="Bo’s Coffee Main Office"/></Card>;
}

function InternshipProfile({profile,skills,credited,remaining,isOwn}:{profile:Profile;skills:string[];credited:number;remaining:number|null;isOwn:boolean}){const item=profile.internship!;return <>
  <Card title="Internship progress"><div className="grid gap-4 sm:grid-cols-2"><Item label="Company Supervisor" value={`${item.supervisorProfile.user.firstName} ${item.supervisorProfile.user.lastName}`}/><Item label="School Coordinator" value={`${item.coordinatorProfile.user.firstName} ${item.coordinatorProfile.user.lastName}`}/><Item label="Internship dates" value={`${date(item.startDate)} – ${date(item.endDate)}`}/><Item label="Required hours" value={item.requiredHours==null?"Not provided":`${item.requiredHours} hours`}/><Item label="Credited hours" value={`${hours(credited)} hours`}/><Item label="Remaining hours" value={remaining==null?"Not available":`${hours(remaining)} hours`}/></div></Card>
  <Card title="Recent approved Work Logs">{item.workLogs.length?<div className="divide-y divide-border">{item.workLogs.map(log=><div className="py-3" key={`${log.workDate.toISOString()}-${log.title}`}><strong className="text-sm">{log.title}</strong><small className="block text-muted">{date(log.workDate)}</small></div>)}</div>:<Empty/>}</Card>
  <Card title="Skills and evidence">{skills.length?<><ul className="flex flex-wrap gap-2">{skills.map(skill=><li className="status-badge status-info" key={skill}>{skill}</li>)}</ul><p className="mt-3 text-xs text-muted">Explicitly recorded in approved Work Logs or the Intern-maintained Portfolio.</p></>:<Empty/>}</Card>
  <Card title="Completed work and evaluations"><Item label="Completed Tasks" value={String(item.tasks.length)}/>{profile.latestEvaluation?<><Item label="Latest finalized Evaluation" value={`${TYPE_LABELS[profile.latestEvaluation.evaluationType]} · ${profile.latestEvaluation.overallScore===null?"No overall score":`${profile.latestEvaluation.overallScore.toString()} / 100`}`}/><p className="mt-3 text-xs text-muted">Evaluation criteria retain their original 1–5 rating scale.</p></>:<Empty/>}{item.portfolio&&isOwn?<Link href="/portfolio" className="button button-secondary mt-4">Open Portfolio</Link>:item.portfolio?<p className="mt-3 text-sm text-secondary">Portfolio available in the authorized Portfolio workspace.</p>:null}</Card>
  </>}

function RoleActivity({profile}:{profile:Profile}){if(profile.supervisorProfile)return <Card title="Internship activity"><Item label="Assigned Interns" value={String(profile.supervisorProfile.assignments.length)}/></Card>;if(profile.coordinatorProfile)return <Card title="Internship activity"><Item label="Monitored Interns" value={String(profile.coordinatorProfile.assignments.length)}/></Card>;return <Card title="IntelliTrack profile"><p className="profile-copy">This profile shows verified role and Main Office context. Operational records remain in their authorized workspaces.</p></Card>}
function Card({title,children}:{title:string;children:React.ReactNode}){return <section className="ui-card p-5 sm:p-6"><h2 className="mb-4 font-semibold text-brand-900">{title}</h2>{children}</section>}
function Item({label,value}:{label:string;value:string}){return <dl className="mb-3"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 text-sm font-semibold text-brand-900">{value}</dd></dl>}
function Empty(){return <p className="text-sm text-muted">Not enough activity yet.</p>}
