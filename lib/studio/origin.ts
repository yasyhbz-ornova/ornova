// Normalize only the www/apex pair controlled by the configured site. Preview
// and local hosts are intentionally left alone; the target never comes from Host.
export function studioCanonicalDestination(activeHost: string | null, configuredSite?: string): string | null {
  if (!activeHost || !configuredSite) return null;
  try {
    const site = new URL(configuredSite);
    if (site.protocol !== "https:" || site.username || site.password) return null;
    const active = new URL(`https://${activeHost}`).hostname;
    const counterpart = site.hostname.startsWith("www.") ? site.hostname.slice(4) : `www.${site.hostname}`;
    return active === counterpart ? new URL("/custom-design", site.origin).href : null;
  } catch { return null; }
}
