"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { prisma } from "@/lib/prisma";
import { emptyToNull,profileInputSchema } from "@/lib/profile/domain";
import { profileMediaPath,removeProfileMedia,uploadProfileMedia,validateProfileImage } from "@/lib/profile/storage";

export async function updateOwnProfile(formData:FormData){
  const actor=await requireCurrentUser();
  const parsed=profileInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if(!parsed.success)redirect(`/profile/edit?error=${encodeURIComponent(parsed.error.issues[0]?.message??"Review your profile.")}`);
  const current=await prisma.user.findUnique({where:{id:actor.id},select:{profilePhotoPath:true,coverPhotoPath:true}});
  if(!current)redirect("/profile");
  const avatarValue=formData.get("profilePhoto"),coverValue=formData.get("coverPhoto");
  const avatar=avatarValue instanceof File&&avatarValue.size?avatarValue:null,cover=coverValue instanceof File&&coverValue.size?coverValue:null;
  const avatarError=validateProfileImage(avatar),coverError=validateProfileImage(cover);
  if(avatarError||coverError)redirect(`/profile/edit?error=${encodeURIComponent(avatarError??coverError!)}`);
  const removeAvatar=formData.get("removeProfilePhoto")==="on",removeCover=formData.get("removeCoverPhoto")==="on";
  const avatarPath=avatar?profileMediaPath(actor.id,"avatar",avatar.type):removeAvatar?null:current.profilePhotoPath;
  const coverPath=cover?profileMediaPath(actor.id,"cover",cover.type):removeCover?null:current.coverPhotoPath;
  const uploaded:string[]=[];
  try{if(avatar&&avatarPath){await uploadProfileMedia(avatarPath,avatar);uploaded.push(avatarPath)}if(cover&&coverPath){await uploadProfileMedia(coverPath,cover);uploaded.push(coverPath)}}catch{await Promise.all(uploaded.map(removeProfileMedia));redirect("/profile/edit?error=The+profile+image+could+not+be+stored.")}
  try{await prisma.user.update({where:{id:actor.id},data:{firstName:parsed.data.firstName,middleName:emptyToNull(parsed.data.middleName),lastName:parsed.data.lastName,suffix:emptyToNull(parsed.data.suffix),phoneNumber:emptyToNull(parsed.data.phoneNumber),bio:emptyToNull(parsed.data.bio),profilePhotoPath:avatarPath,coverPhotoPath:coverPath}})}catch{await Promise.all(uploaded.map(removeProfileMedia));redirect("/profile/edit?error=Your+profile+could+not+be+saved.")}
  const obsolete=[avatar||removeAvatar?current.profilePhotoPath:null,cover||removeCover?current.coverPhotoPath:null].filter((path):path is string=>Boolean(path)&&!uploaded.includes(path!));
  await Promise.all(obsolete.map(removeProfileMedia));
  revalidatePath("/profile");revalidatePath("/profile/edit");revalidatePath("/dashboard");redirect("/profile?updated=1");
}
