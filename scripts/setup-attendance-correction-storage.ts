import "dotenv/config";
import { CORRECTIONS_BUCKET,CORRECTION_MIME_TYPES,MAX_CORRECTION_FILE_BYTES } from "../src/lib/attendance-corrections/storage.ts";
import { createAdminClient } from "../src/lib/supabase/admin.ts";
async function main(){const storage=createAdminClient().storage;const{data,error}=await storage.getBucket(CORRECTIONS_BUCKET);if(data&&!error){console.log("Private attendance correction bucket already exists; no changes were made.");return}const result=await storage.createBucket(CORRECTIONS_BUCKET,{public:false,fileSizeLimit:MAX_CORRECTION_FILE_BYTES,allowedMimeTypes:[...CORRECTION_MIME_TYPES]});if(result.error)throw new Error("Private attendance correction bucket setup failed.");console.log("Private attendance correction bucket created successfully.")}
main().catch((error:unknown)=>{console.error(error instanceof Error?error.message:"Private attendance correction bucket setup failed safely.");process.exitCode=1});
