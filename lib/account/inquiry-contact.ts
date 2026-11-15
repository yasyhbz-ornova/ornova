type ContactSource = {
  display_name?: unknown;
  phone?: unknown;
} | null | undefined;

type AuthIdentity = {
  phone?: unknown;
  email?: unknown;
  user_metadata?: Record<string, unknown> | null;
} | null | undefined;

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getInquiryContactDefaults(
  profile: ContactSource,
  user: AuthIdentity,
): { name: string; contact: string } {
  const metadata = user?.user_metadata;
  const name = readText(profile?.display_name)
    || readText(metadata?.full_name)
    || readText(metadata?.name);
  const contact = readText(user?.phone)
    || readText(profile?.phone)
    || readText(user?.email);

  return { name: name.slice(0, 80), contact: contact.slice(0, 320) };
}
