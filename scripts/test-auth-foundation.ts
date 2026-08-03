import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyCurrentUser,
  type ApplicationUser,
} from "@/lib/auth/current-user-state";
import { getCurrentUserGuardDestination } from "@/lib/auth/guard-destination";
import { getSafeRedirectPath } from "@/lib/auth/redirects";
import { getSupabasePublicEnvironment } from "@/lib/supabase/config";

const authUser = { authId: "018f1d7e-a000-7000-8000-000000000001" };
const activeUser: ApplicationUser = {
  id: "018f1d7e-a000-7000-8000-000000000002",
  authId: authUser.authId,
  email: "intern@example.test",
  role: "INTERN",
  firstName: "Test",
  lastName: "Intern",
  isActive: true,
};

test("missing Supabase environment variables produce a safe error", () => {
  assert.throws(
    () => getSupabasePublicEnvironment({}),
    /Missing: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
  );
});

test("redirect validation accepts internal paths and rejects external URLs", () => {
  assert.equal(getSafeRedirectPath("/dashboard?tab=hours"), "/dashboard?tab=hours");
  assert.equal(getSafeRedirectPath("https://example.com"), "/dashboard");
  assert.equal(getSafeRedirectPath("//example.com"), "/dashboard");
  assert.equal(getSafeRedirectPath("/\\example.com"), "/dashboard");
});

test("unauthenticated state maps to the login guard", () => {
  const state = classifyCurrentUser(null, null);
  assert.deepEqual(state, { status: "unauthenticated" });
  assert.equal(getCurrentUserGuardDestination(state), "/login");
});

test("authenticated identity without a user is not provisioned", () => {
  const state = classifyCurrentUser(authUser, null);
  assert.equal(state.status, "not-provisioned");
  assert.equal(
    getCurrentUserGuardDestination(state),
    "/account/not-provisioned",
  );
});

test("inactive user maps to the inactive account state", () => {
  const state = classifyCurrentUser(authUser, { ...activeUser, isActive: false });
  assert.equal(state.status, "inactive");
  assert.equal(getCurrentUserGuardDestination(state), "/account/inactive");
});

test("active user is returned without a redirect", () => {
  const state = classifyCurrentUser(authUser, activeUser);
  assert.equal(state.status, "active");
  assert.equal(getCurrentUserGuardDestination(state), null);
  if (state.status === "active") assert.equal(state.user.id, activeUser.id);
});
