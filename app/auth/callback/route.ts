import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildAuthErrorRedirectPath, safeInternalPath, type AuthCallbackErrorCode } from "@/lib/auth/inputs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const safeNext = safeInternalPath(url.searchParams.get("next"));
  const redirectToLoginWithError = (error: AuthCallbackErrorCode) =>
    NextResponse.redirect(new URL(buildAuthErrorRedirectPath(error, url.searchParams.get("next")), url.origin));

  if (!code) {
    return redirectToLoginWithError("missing_code");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return redirectToLoginWithError("auth_callback");
    }
    return NextResponse.redirect(new URL(safeNext, url.origin));
  } catch {
    return redirectToLoginWithError("auth_unavailable");
  }
}
