const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export type AuthCallbackErrorCode = "missing_code" | "auth_callback" | "auth_unavailable";
type AuthCallbackErrorMessage = {
  [Code in AuthCallbackErrorCode]: string;
};

const AUTH_CALLBACK_ERROR_MESSAGES: AuthCallbackErrorMessage = {
  missing_code: "پیوند ورود کامل نیست یا کد آن را ندارد. از همین صفحه یک لینک تازه درخواست کنید.",
  auth_callback: "تأیید ورود انجام نشد یا پیوند منقضی شده است. یک لینک تازه درخواست کنید.",
  auth_unavailable: "فعلاً ارتباط با سرویس ورود برقرار نشد. کمی بعد دوباره تلاش کنید.",
};

export function toLatinDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = PERSIAN_DIGITS.indexOf(digit);
    const index = persianIndex >= 0 ? persianIndex : ARABIC_DIGITS.indexOf(digit);
    return String(index);
  });
}

export function normalizeIranianPhone(value: string) {
  const compact = toLatinDigits(value).replace(/[\s()-]/g, "");
  if (compact.startsWith("09") && compact.length === 11) return `+98${compact.slice(1)}`;
  if (compact.startsWith("9") && compact.length === 10) return `+98${compact}`;
  return compact;
}

export function safeInternalPath(value: string | null, fallback = "/account") {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const base = "https://ornova.invalid";
    const candidate = new URL(value, base);
    if (candidate.origin !== base) return fallback;
    if (!candidate.pathname.startsWith("/") || candidate.pathname.startsWith("//") || candidate.pathname.includes("\\")) {
      return fallback;
    }
    return `${candidate.pathname}${candidate.search}${candidate.hash}`;
  } catch {
    return fallback;
  }
}

export function buildAuthErrorRedirectPath(error: AuthCallbackErrorCode, next: string | null) {
  const params = new URLSearchParams({ error, next: safeInternalPath(next) });
  return `/login?${params.toString()}`;
}

export function buildAuthCallbackUrl(activeOrigin: string, configuredSite: string | undefined, next: string | null) {
  const active = new URL(activeOrigin);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(active.hostname);
  const callback = new URL("/auth/callback", local ? active.origin : configuredSite || active.origin);
  callback.searchParams.set("next", safeInternalPath(next));
  return callback.toString();
}

export function getAuthCallbackErrorMessage(error: string | null) {
  if (!error || !Object.hasOwn(AUTH_CALLBACK_ERROR_MESSAGES, error)) return null;
  return AUTH_CALLBACK_ERROR_MESSAGES[error as AuthCallbackErrorCode];
}
