import "server-only";
import { parsePricingRequest, parsePricingResponse, type PricingRequest, type PricingResponse } from "@/lib/pricing/contract";

type PricingConfig = { url: string; token: string; transport?: "https"; allowedOrigin?: string };
export class PricingRejected extends Error {
  constructor(readonly code: string) { super("Pricing calculation rejected"); }
}

// Destinations are operator-controlled server configuration, never request/user input.
export function pricingConfig(env: Record<string, string | undefined> = process.env): PricingConfig | null {
  if (env.ORNOVA_PRICING_ENABLED !== "true") return null;
  const raw = env.ORNOVA_PRICING_URL ?? "", token = env.ORNOVA_PRICING_TOKEN ?? "";
  try {
    const url = new URL(raw);
    if (url.pathname !== "/v1/preview" || url.username || url.password || /[?#]/.test(raw) || !/^[a-zA-Z0-9_-]{32,256}$/.test(token)) return null;
    const transport = env.ORNOVA_PRICING_TRANSPORT || "loopback";
    if (transport === "loopback") {
      if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || !url.port) return null;
      return { url: url.href, token };
    }
    if (transport !== "https" || url.protocol !== "https:" || raw !== url.href || url.port === "0") return null;
    const hostname = url.hostname;
    if (hostname.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname) || /\.(?:localhost|local|internal|lan|home|onion|arpa|invalid|test|example)$/.test(hostname)) return null;
    const allowedOrigin = env.ORNOVA_PRICING_ALLOWED_ORIGIN;
    if (allowedOrigin !== url.origin) return null;
    return { url: url.href, token, transport: "https", allowedOrigin };
  } catch { return null; }
}

async function readResponse(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw Error("Pricing unavailable");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0, body = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) throw Error("Pricing unavailable");
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    return JSON.parse(body);
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export async function requestPricingPreview(request: PricingRequest, configuration: PricingConfig | null = pricingConfig(), fetcher: typeof fetch = fetch): Promise<PricingResponse> {
  const config = configuration && pricingConfig({ ORNOVA_PRICING_ENABLED: "true", ORNOVA_PRICING_URL: configuration.url, ORNOVA_PRICING_TOKEN: configuration.token, ORNOVA_PRICING_TRANSPORT: configuration.transport ?? "loopback", ORNOVA_PRICING_ALLOWED_ORIGIN: configuration.allowedOrigin });
  const input = parsePricingRequest(request);
  if (!config || !input.success) throw Error("Pricing unavailable");
  try {
    const response = await fetcher(config.url, {
      method: "POST", headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(input.data), redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (response.status !== 200 && response.status !== 422) { await response.body?.cancel(); throw Error("Pricing unavailable"); }
    const body = await readResponse(response);
    if (response.status === 422) {
      const code = typeof body === "object" && body !== null && "code" in body ? body.code : null;
      if (typeof code === "string" && ["BELOW_FLOOR", "REASON_REQUIRED", "CALCULATION_REJECTED", "NUMERIC_RANGE"].includes(code)) throw new PricingRejected(code);
      throw Error("Pricing unavailable");
    }
    const parsed = parsePricingResponse(body, input.data);
    if (!parsed.success) throw Error("Pricing unavailable");
    return parsed.data;
  } catch (error) {
    if (error instanceof PricingRejected) throw error;
    throw Error("Pricing unavailable");
  }
}
