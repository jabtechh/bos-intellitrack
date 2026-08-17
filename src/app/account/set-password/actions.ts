"use server";
import{requireAuthUser}from"@/lib/auth/require-auth-user";import{createAdminClient}from"@/lib/supabase/admin";
export async function completePasswordSetup(){const user=await requireAuthUser();try{const{error}=await createAdminClient().auth.admin.updateUserById(user.authId,{app_metadata:{password_change_required:false,welcome_pending:true}});return!error}catch{return false}}
