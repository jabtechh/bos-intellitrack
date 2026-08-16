import { notFound } from "next/navigation";
import { ProfileEditForm } from "@/components/profile-edit-form";
import { requireProfileViewer } from "@/lib/profile/authorization";
import { getProfile } from "@/lib/profile/data";
export default async function EditProfile({searchParams}:{searchParams:Promise<{error?:string}>}){const viewer=await requireProfileViewer(),[profile,query]=await Promise.all([getProfile(viewer,viewer.id),searchParams]);if(!profile)notFound();return <ProfileEditForm profile={profile} error={query.error}/>}
