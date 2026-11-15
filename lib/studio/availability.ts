import "server-only";
import { getAiConfig } from "@/lib/ai/gateway";

// Operator configuration only. Preview permission, database/provider health,
// consent and account ownership are still enforced by the generation endpoint.
export function getStudioImageMode(env: Record<string, string | undefined> = process.env): "offline" | "preview" {
  try {
    const config = getAiConfig(env);
    return config.imageModel.trim() && env.SUPABASE_SERVICE_ROLE_KEY?.trim() ? "preview" : "offline";
  } catch { return "offline"; }
}
