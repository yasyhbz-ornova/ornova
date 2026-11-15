import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isStudioId } from "@/lib/studio/conversation";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const fail = (status: number) => Response.json({ error: "تصویر خصوصی در دسترس نیست." }, { status, headers });
  const { id } = await params;
  if (!isStudioId(id)) return fail(404);
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail(401);
    const { data: row, error } = await supabase.from("studio_generations").select("storage_path,mime").eq("id", id).eq("user_id", user.id).eq("state", "ready").maybeSingle();
    if (error) return fail(503);
    if (!row || !row.storage_path?.startsWith(`${user.id}/${id}.`) || !["image/png", "image/jpeg", "image/webp"].includes(row.mime)) return fail(404);
    const { data, error: downloadError } = await supabase.storage.from("ornova-designs").download(row.storage_path);
    if (downloadError || !data || data.size > 10485760) return fail(503);
    return new Response(data, { headers: { ...headers, "Content-Type": row.mime, "Content-Disposition": "inline" } });
  } catch { return fail(503); }
}
