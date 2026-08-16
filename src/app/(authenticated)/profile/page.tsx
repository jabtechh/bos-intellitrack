import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile-view";
import { requireProfileViewer } from "@/lib/profile/authorization";
import { getProfile } from "@/lib/profile/data";
export default async function OwnProfile(){const viewer=await requireProfileViewer(),profile=await getProfile(viewer,viewer.id);if(!profile)notFound();return <ProfileView profile={profile} isOwn/>}
