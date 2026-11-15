import { NextResponse } from "next/server";

export const runtime = "nodejs";
const mediaName = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/;
const types: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  if (!mediaName.test(file)) return new Response(null, { status: 404 });
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!origin || !/^https:\/\/[^/]+\.supabase\.co$/.test(origin)) return new Response(null, { status: 503 });
  try {
    const upstream = await fetch(`${origin}/storage/v1/object/public/ornova-catalog/${file}`, { redirect: "error", signal: AbortSignal.timeout(10000) });
    if (!upstream.ok) return new Response(null, { status: upstream.status === 404 ? 404 : 503 });
    const type = types[file.split(".").at(-1) ?? ""];
    return new NextResponse(upstream.body, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 503 }); }
}
