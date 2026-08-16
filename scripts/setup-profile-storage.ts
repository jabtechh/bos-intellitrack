import "dotenv/config";
import { createAdminClient } from "../src/lib/supabase/admin.ts";
import { MAX_PROFILE_IMAGE_BYTES, PROFILE_IMAGE_TYPES, PROFILE_MEDIA_BUCKET } from "../src/lib/profile/storage.ts";

async function main(){const storage=createAdminClient().storage;const{data,error}=await storage.listBuckets();if(error)throw new Error("Profile media storage verification failed.");const options={public:false,fileSizeLimit:MAX_PROFILE_IMAGE_BYTES,allowedMimeTypes:[...PROFILE_IMAGE_TYPES]};const result=data.some(bucket=>bucket.name===PROFILE_MEDIA_BUCKET)?await storage.updateBucket(PROFILE_MEDIA_BUCKET,options):await storage.createBucket(PROFILE_MEDIA_BUCKET,options);if(result.error)throw new Error("Private profile media bucket setup failed.");console.log("Private profile media storage is ready.")}
main().catch(error=>{console.error(error instanceof Error?error.message:"Profile media setup failed.");process.exitCode=1});
