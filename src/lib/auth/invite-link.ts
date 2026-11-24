// Pure helpers for the invitation / password-setup link (no Supabase, no React).
// Supabase invite e-mails redirect with the session in the URL fragment (implicit grant):
//   /account/set-password#access_token=…&refresh_token=…&type=invite
// or, when the link is expired or already used:
//   /account/set-password#error=access_denied&error_code=otp_expired&error_description=…
// The app's browser client uses PKCE, which rejects fragment sessions, so the page reads them itself.

export type InviteLink =
  | { kind: "session"; accessToken: string; refreshToken: string; type: string }
  | { kind: "error"; reason: "expired" | "invalid" }
  | { kind: "none" };

export function parseInviteLink(hash: string, search = ""): InviteLink {
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  const query = new URLSearchParams(search.replace(/^\?/, ""));
  const errorCode = fragment.get("error_code") ?? query.get("error_code");
  if (errorCode || fragment.get("error") || query.get("error")) {
    return { kind: "error", reason: errorCode === "otp_expired" ? "expired" : "invalid" };
  }
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  if (accessToken && refreshToken) return { kind: "session", accessToken, refreshToken, type: fragment.get("type") ?? "invite" };
  return { kind: "none" };
}

export const PASSWORD_RULES = [
  { key: "length", label: "At least 12 characters", test: (value: string) => value.length >= 12 },
  { key: "upper", label: "An uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { key: "lower", label: "A lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { key: "number", label: "A number", test: (value: string) => /[0-9]/.test(value) },
  { key: "symbol", label: "A special character", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const;

export const passwordMeetsRules = (value: string) => PASSWORD_RULES.every((rule) => rule.test(value));

export const INVITE_MESSAGES = {
  expired: "This invitation link has expired or was already used. Ask your Company Representative to resend your invitation.",
  invalid: "This invitation link is not valid. Ask your Company Representative to resend your invitation.",
  noSession: "Open this page from the invitation link in your e-mail, or sign in if you already set your password.",
} as const;
