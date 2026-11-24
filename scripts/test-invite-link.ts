// Invitation / password-setup link handling (pure) and the set-password page contract.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { INVITE_MESSAGES, parseInviteLink, passwordMeetsRules, PASSWORD_RULES } from "../src/lib/auth/invite-link.ts";

test("reads the session Supabase puts in the invite redirect fragment", () => {
  assert.deepEqual(parseInviteLink("#access_token=a.b.c&expires_in=3600&refresh_token=r1&token_type=bearer&type=invite"), { kind: "session", accessToken: "a.b.c", refreshToken: "r1", type: "invite" });
});

test("expired, used and malformed links are refused with a clear reason", () => {
  assert.deepEqual(parseInviteLink("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"), { kind: "error", reason: "expired" });
  assert.deepEqual(parseInviteLink("", "?error=server_error&error_code=unexpected_failure"), { kind: "error", reason: "invalid" });
  assert.deepEqual(parseInviteLink("#access_token=only"), { kind: "none" });
  assert.deepEqual(parseInviteLink(""), { kind: "none" });
  assert.match(INVITE_MESSAGES.expired, /resend your invitation/);
});

test("password rules match the previous policy", () => {
  assert.equal(PASSWORD_RULES.length, 5);
  assert.equal(passwordMeetsRules("Short1!"), false);
  assert.equal(passwordMeetsRules("alllowercase123!"), false);
  assert.equal(passwordMeetsRules("NoNumbersHere!!"), false);
  assert.equal(passwordMeetsRules("NoSymbols12345"), false);
  assert.equal(passwordMeetsRules("Brewed-Coffee-2026"), true);
});

test("set-password page establishes the invite session itself and strips tokens from the URL", () => {
  const page = readFileSync("src/app/account/set-password/page.tsx", "utf8");
  assert.match(page, /parseInviteLink\(window\.location\.hash/);
  assert.match(page, /auth\.setSession\(/);
  assert.match(page, /history\.replaceState\(null, "", window\.location\.pathname\)/);
  assert.match(page, /completePasswordSetup\(\)/);
  assert.match(page, /window\.location\.assign\("\/account\/welcome"\)/);
  assert.match(page, /login-shell/);
});

test("browser Supabase client reads NEXT_PUBLIC values literally so Next.js inlines them", () => {
  const client = readFileSync("src/lib/supabase/client.ts", "utf8");
  assert.match(client, /NEXT_PUBLIC_SUPABASE_URL: process\.env\.NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(client, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process\.env\.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(client, /getSupabasePublicEnvironment\(\)/);
});
