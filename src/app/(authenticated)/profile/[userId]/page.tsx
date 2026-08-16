import { notFound } from "next/navigation";
import { z } from "zod";
import { ProfileView } from "@/components/profile-view";
import { requireProfileViewer } from "@/lib/profile/authorization";
import { getProfile } from "@/lib/profile/data";
export default async function UserProfile({params}:{params:Promise<{userId:string}>}){const viewer=await requireProfileViewer(),parsed=z.string().uuid().safeParse((await params).userId);if(!parsed.success)notFound();const profile=await getProfile(viewer,parsed.data);if(!profile)notFound();return <ProfileView profile={profile} isOwn={viewer.id===parsed.data}/>}
