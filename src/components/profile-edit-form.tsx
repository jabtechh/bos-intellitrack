"use client";
/* eslint-disable @next/next/no-img-element -- The editor previews local blob URLs and private signed media. */
import Link from "next/link";
import { useEffect,useState } from "react";
import { updateOwnProfile } from "@/app/profile/actions";
import { initials } from "@/lib/profile/domain";
import type { ProfileEditDto } from "@/lib/profile/domain";

type Props={profile:ProfileEditDto;error?:string};
export function ProfileEditForm({profile,error}:Props){
  const[avatar,setAvatar]=useState<string|null>(profile.avatarUrl),[cover,setCover]=useState<string|null>(profile.coverUrl);
  useEffect(()=>()=>{if(avatar?.startsWith("blob:"))URL.revokeObjectURL(avatar);if(cover?.startsWith("blob:"))URL.revokeObjectURL(cover)},[avatar,cover]);
  const preview=(file:File|undefined,set:(value:string|null)=>void)=>{if(file)set(URL.createObjectURL(file))};
  return <form action={updateOwnProfile} className="profile-edit-page">
    {error?<p className="inline-notice" role="alert">{error}</p>:null}
    <section className="profile-hero ui-card">
      <div className="profile-cover" style={cover?{backgroundImage:`url(${JSON.stringify(cover).slice(1,-1)})`}:undefined}><label className="profile-media-action">Change cover<input className="sr-only" type="file" name="coverPhoto" accept="image/jpeg,image/png,image/webp" onChange={event=>preview(event.target.files?.[0],setCover)}/></label></div>
      <div className="profile-identity">
        <div className="profile-avatar-lg">{avatar?<img src={avatar} alt="Profile preview"/>:<span>{initials(profile.firstName,profile.lastName)}</span>}</div>
        <label className="button button-secondary">Change Photo<input className="sr-only" type="file" name="profilePhoto" accept="image/jpeg,image/png,image/webp" onChange={event=>preview(event.target.files?.[0],setAvatar)}/></label>
      </div>
    </section>
    <section className="ui-card mt-6 space-y-5 p-5 sm:p-7"><div><p className="eyebrow">Personal information</p><h1 className="mt-2 font-heading text-3xl font-semibold text-foreground">Edit profile</h1><p className="mt-2 text-sm text-secondary">Your role and internship details remain managed by IntelliTrack.</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="First name" name="firstName" value={profile.firstName} required/><Field label="Middle name" name="middleName" value={profile.middleName??""}/><Field label="Last name" name="lastName" value={profile.lastName} required/><Field label="Suffix" name="suffix" value={profile.suffix??""}/><Field label="Phone number" name="phoneNumber" value={profile.phoneNumber??""} type="tel"/></div>
      <label className="field"><span>About</span><textarea name="bio" rows={6} maxLength={1000} defaultValue={profile.bio??""}/><small>Share a concise professional introduction. Maximum 1,000 characters.</small></label>
      <div className="grid gap-3 sm:grid-cols-2">{profile.avatarUrl?<label className="flex items-center gap-3 text-sm"><input type="checkbox" name="removeProfilePhoto" onChange={event=>event.target.checked&&setAvatar(null)}/>Remove Photo</label>:null}{profile.coverUrl?<label className="flex items-center gap-3 text-sm"><input type="checkbox" name="removeCoverPhoto" onChange={event=>event.target.checked&&setCover(null)}/>Remove cover photo</label>:null}</div>
      <div className="action-bar justify-end"><Link href="/profile" className="button button-secondary">Cancel</Link><button className="button button-primary">Save Changes</button></div>
    </section>
  </form>;
}
function Field({label,name,value,type="text",required=false}:{label:string;name:string;value:string;type?:string;required?:boolean}){return <label className="field"><span>{label}</span><input name={name} type={type} defaultValue={value} required={required}/></label>}
