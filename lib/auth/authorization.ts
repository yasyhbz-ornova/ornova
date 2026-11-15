type AuthUser = { app_metadata?: Record<string, unknown> } | null;

export function isOrnovaStaff(user: AuthUser): boolean {
  return user?.app_metadata?.ornova_role === "staff";
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
