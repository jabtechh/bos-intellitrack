import { createAdminClient } from "@/lib/supabase/admin";

export const ATTENDANCE_BUCKET = "attendance-evidence";

export function evidencePath(assignmentId: string, attendanceId: string, kind: "clock-in" | "clock-out", mimeType: string) {
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return `${assignmentId}/${attendanceId}/${kind}.${extension}`;
}

export async function uploadEvidence(path: string, file: File) {
  const supabase = createAdminClient();
  const bytes = await file.arrayBuffer();
  const { error } = await supabase.storage.from(ATTENDANCE_BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) throw new Error("Attendance evidence could not be stored.");
}
export async function removeEvidence(path: string) { try { const { error } = await createAdminClient().storage.from(ATTENDANCE_BUCKET).remove([path]); return !error; } catch { return false; } }
export async function signedEvidenceUrl(path: string | null, expiresIn = 300) { if (!path) return null; const { data, error } = await createAdminClient().storage.from(ATTENDANCE_BUCKET).createSignedUrl(path, expiresIn); return error ? null : data.signedUrl; }
