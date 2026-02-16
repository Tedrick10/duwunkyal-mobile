/**
 * API Base URL – ပြောင်းချင်ရင် ဒီမှာ (သို့) .env မှာ EXPO_PUBLIC_API_BASE_URL သတ်မှတ်ပါ။
 * Change here or set EXPO_PUBLIC_API_BASE_URL in .env to switch environments.
 * Fallback: EXPO_PUBLIC_DOMAIN (e.g. myapp.replit.dev:5000) or default below.
 */
const envBase = process.env.EXPO_PUBLIC_API_BASE_URL;
const envDomain = process.env.EXPO_PUBLIC_DOMAIN;

function fromDomain(): string {
  if (!envDomain || envDomain === "undefined" || envDomain === "null")
    // return "localhosthttp://";
    return "http://192.168.1.2:8000";
  const protocol =
    envDomain.startsWith("localhost") || envDomain.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${envDomain}`.replace(/\/$/, "");
}

export const API_BASE_URL =
  envBase && envBase !== "undefined" && envBase !== "null"
    ? envBase.replace(/\/$/, "")
    : fromDomain();

/** Full URL for a path (e.g. path = "/api/auth/register" => "http://localhost/api/auth/register") */
export function apiUrl(path: string): string {
  const base = API_BASE_URL;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
