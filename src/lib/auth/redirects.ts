const DEFAULT_DESTINATION = "/dashboard";

export function getSafeRedirectPath(
  destination: FormDataEntryValue | string | null | undefined,
  fallback = DEFAULT_DESTINATION,
): string {
  if (typeof destination !== "string") {
    return fallback;
  }

  const path = destination.trim();

  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(path)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(path, "https://intellitrack.invalid");
    return parsed.origin === "https://intellitrack.invalid"
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
