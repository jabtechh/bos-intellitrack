"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markNotificationReadAction } from "@/app/notifications/actions";

export function NotificationItem({ item }: { item: { id:string; title:string; body:string|null; href:string|null; readAt:Date|null; createdAt:Date; actor:{firstName:string;lastName:string}|null } }) {
  const router=useRouter(),[pending,start]=useTransition(); const initials=item.actor?`${item.actor.firstName[0]??""}${item.actor.lastName[0]??""}`:"IT";
  const open=()=>start(async()=>{await markNotificationReadAction(item.id);if(item.href)router.push(item.href);else router.refresh()});
  return <article className={`notification-item${item.readAt?"":" is-unread"}`}><button type="button" onClick={open} disabled={pending} className="notification-open"><span className="avatar">{initials}</span><span><strong>{item.title}</strong>{item.body?<span>{item.body}</span>:null}<time dateTime={item.createdAt.toISOString()}>{new Intl.DateTimeFormat("en-PH",{dateStyle:"medium",timeStyle:"short"}).format(item.createdAt)}</time></span></button>{!item.readAt?<button type="button" onClick={()=>start(async()=>{await markNotificationReadAction(item.id);router.refresh()})} disabled={pending}>Mark read</button>:null}</article>;
}
