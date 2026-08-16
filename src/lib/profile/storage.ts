import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const PROFILE_MEDIA_BUCKET = "profile-media";
export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const extensions: Record<string,string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function validateProfileImage(file: File | null) {
  if (!file || file.size === 0) return null;
  if (!PROFILE_IMAGE_TYPES.includes(file.type as typeof PROFILE_IMAGE_TYPES[number])) return "Use a JPEG, PNG, or WebP image.";
  if (file.size > MAX_PROFILE_IMAGE_BYTES) return "Profile images must be 5 MB or smaller.";
  const extension=file.name.split(".").pop()?.toLowerCase();
  if (!extension || (extension!==extensions[file.type] && !(file.type==="image/jpeg"&&extension==="jpeg"))) return "The image extension does not match its format.";
  return null;
}

export function profileMediaPath(userId:string,kind:"avatar"|"cover",mime:string){return `${userId}/${kind}/${randomUUID()}.${extensions[mime]}`}
export async function uploadProfileMedia(path:string,file:File){const{error}=await createAdminClient().storage.from(PROFILE_MEDIA_BUCKET).upload(path,file,{contentType:file.type,upsert:false});if(error)throw new Error("Profile image upload failed.")}
export async function removeProfileMedia(path:string|null){if(!path)return true;const{error}=await createAdminClient().storage.from(PROFILE_MEDIA_BUCKET).remove([path]);return !error}
export async function signedProfileMedia(path:string|null){if(!path)return null;const{data,error}=await createAdminClient().storage.from(PROFILE_MEDIA_BUCKET).createSignedUrl(path,300);return error?null:data.signedUrl}
