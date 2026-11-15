import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSameOriginRequest } from "@/lib/auth/authorization";
import { canPreviewAi, getAiConfig, createAiImage, readLimitedBody } from "@/lib/ai/gateway";
import { generateForUser, StudioError } from "@/lib/studio/generation";
import { createStudioStore } from "@/lib/studio/store";

export const runtime = "nodejs";
export const maxDuration = 120;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function POST(request: Request) {
  const error = (message: string, status: number) => Response.json({ error: message }, { status, headers });
  if (!isSameOriginRequest(request)) return error("درخواست نامعتبر است.", 403);
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    // Authentication precedes body handling and all privileged/provider initialization.
    if (!user) return error("برای ساخت تصویر وارد حساب شو؛ ایده‌ات در این صفحه باقی است.", 401);
    let input: unknown;
    try { input = JSON.parse(await readLimitedBody(new Response(request.body), 8192)); }
    catch { return error("متن درخواست معتبر نیست یا بیش از اندازه طولانی است.", 400); }
    const result = await generateForUser({ userId: user.id, allowed: canPreviewAi(user) }, input, () => {
      const config = getAiConfig();
      const store = createStudioStore();
      return { store, generate: (idea) => createAiImage(idea, config) };
    });
    return Response.json(result, { headers });
  } catch (failure) {
    if (failure instanceof StudioError) return error(failure.message, failure.status);
    return error("اتصال ساخت تصویر هنوز آماده نیست. ایده‌ات در این صفحه مانده است.", 503);
  }
}
