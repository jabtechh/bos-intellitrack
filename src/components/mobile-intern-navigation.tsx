"use client";

/* eslint-disable @next/next/no-img-element -- Private signed profile media must not enter shared optimization caches. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/(auth)/actions";
import { Icon, type IconName } from "./icons";

const groups:{title:string;items:{href:string;label:string;icon:IconName}[]}[]=[
  {title:"Internship",items:[{href:"/calendar",label:"Internship Calendar",icon:"clock"},{href:"/tasks",label:"Tasks",icon:"review"}]},
  {title:"Development",items:[{href:"/evaluations",label:"Evaluations",icon:"journal"},{href:"/feedback",label:"Feedback",icon:"review"},{href:"/insights",label:"Insights",icon:"review"}]},
  {title:"Resources",items:[{href:"/documents",label:"Documents",icon:"journal"},{href:"/announcements",label:"Announcements",icon:"bell"}]},
  {title:"Profile & reports",items:[{href:"/portfolio",label:"Portfolio",icon:"journal"},{href:"/reports",label:"Reports",icon:"review"},{href:"/profile",label:"Profile",icon:"users"}]},
];
const primary=[{href:"/dashboard",label:"Dashboard",icon:"home" as IconName},{href:"/attendance",label:"Attendance",icon:"clock" as IconName},{href:"/work-logs",label:"Work Logs",icon:"journal" as IconName}];

export function MobileInternNavigation({name,role,avatarUrl,initials}:{name:string;role:string;avatarUrl:string|null;initials:string}){
  const pathname=usePathname(),[account,setAccount]=useState(false),[more,setMore]=useState(false),accountRef=useRef<HTMLDivElement>(null),closeRef=useRef<HTMLButtonElement>(null),moreButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(!account)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setAccount(false)};const outside=(event:PointerEvent)=>{if(!accountRef.current?.contains(event.target as Node))setAccount(false)};document.addEventListener("keydown",close);document.addEventListener("pointerdown",outside);return()=>{document.removeEventListener("keydown",close);document.removeEventListener("pointerdown",outside)}},[account]);
  useEffect(()=>{if(!more)return;const previous=document.activeElement as HTMLElement|null,trigger=moreButton.current;document.body.classList.add("mobile-sheet-open");closeRef.current?.focus();const key=(event:KeyboardEvent)=>{if(event.key==="Escape")setMore(false);if(event.key==="Tab"){const nodes=[...document.querySelectorAll<HTMLElement>("[data-more-sheet] a,[data-more-sheet] button")];if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1)!;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}};document.addEventListener("keydown",key);return()=>{document.body.classList.remove("mobile-sheet-open");document.removeEventListener("keydown",key);(previous??trigger)?.focus()}},[more]);
  return <>
    <div className="mobile-account" ref={accountRef}><button className="mobile-avatar-button" aria-label="Open account menu" aria-expanded={account} onClick={()=>setAccount(value=>!value)}><span className="avatar">{avatarUrl?<img src={avatarUrl} alt=""/>:initials}</span></button>{account?<section className="mobile-account-menu" aria-label="Account menu"><header><strong>{name}</strong><small>{role}</small></header><Link href="/profile" onClick={()=>setAccount(false)}>View profile</Link><Link href="/profile/edit" onClick={()=>setAccount(false)}>Edit profile</Link><form action={logout}><button><Icon name="logout"/>Sign out</button></form></section>:null}</div>
    <nav className="bottom-nav" aria-label="Intern mobile navigation">{primary.map(item=><Link key={item.href} href={item.href} aria-current={pathname===item.href||pathname.startsWith(`${item.href}/`)?"page":undefined} className={pathname===item.href||pathname.startsWith(`${item.href}/`)?"is-active":undefined}><Icon name={item.icon}/><span>{item.label}</span></Link>)}<button ref={moreButton} type="button" aria-expanded={more} aria-controls="intern-more-sheet" className={more?"is-active":undefined} onClick={()=>setMore(true)}><Icon name="menu"/><span>More</span></button></nav>
    {more?<div className="mobile-sheet-backdrop" onPointerDown={event=>{if(event.target===event.currentTarget)setMore(false)}}><section id="intern-more-sheet" data-more-sheet role="dialog" aria-modal="true" aria-labelledby="more-sheet-title" className="mobile-more-sheet"><header><div><small>Intern workspace</small><h2 id="more-sheet-title">More</h2></div><button ref={closeRef} type="button" onClick={()=>setMore(false)}>Close</button></header><div className="mobile-more-content">{groups.map(group=><section key={group.title}><h3>{group.title}</h3>{group.items.map(item=>{const active=pathname===item.href||pathname.startsWith(`${item.href}/`);return <Link href={item.href} onClick={()=>setMore(false)} key={item.href} aria-current={active?"page":undefined} className={active?"is-active":undefined}><Icon name={item.icon}/><span>{item.label}</span><Icon name="arrow"/></Link>})}</section>)}</div></section></div>:null}
  </>;
}
