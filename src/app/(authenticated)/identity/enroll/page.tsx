// DEC-2026-019 amendment — face photo setup now lives in Getting started (/onboarding).
// This route is kept only so earlier links keep working.
import { redirect } from "next/navigation";
import { IDENTITY_SETUP_HREF } from "@/lib/identity/config";

export default function IdentityEnrollmentRedirect() {
  redirect(IDENTITY_SETUP_HREF);
}
