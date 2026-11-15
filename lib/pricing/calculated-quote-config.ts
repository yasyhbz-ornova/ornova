import "server-only";

export function calculatedQuotesSource(env: Record<string, string | undefined> = process.env): string | null {
  const source = env.ORNOVA_PCS_SOURCE_KEY ?? "";
  return env.ORNOVA_CALCULATED_QUOTES_ENABLED === "true" && env.NEXT_PUBLIC_SUPABASE_URL === "https://urtufzyhqgwszmufhkyt.supabase.co" && /^[a-zA-Z0-9_-]{1,80}$/.test(source) ? source : null;
}
