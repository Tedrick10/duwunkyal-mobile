/**
 * API Base URL – Production server (deployed backend).
 * Mobile app always uses this URL for API requests.
 */
export const API_BASE_URL = "https://duwunkyalgarment.com";

const envPrefix = process.env.EXPO_PUBLIC_API_PREFIX;
const API_PREFIX =
  envPrefix && envPrefix !== "undefined" && envPrefix !== "null"
    ? envPrefix.replace(/^\/|\/$/g, "")
    : "";

/** Full URL for a path (e.g. "/mobile/customerLogin" => base + prefix + path) */
export function apiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path.slice(1) : path;
  const prefix = API_PREFIX ? `/${API_PREFIX}` : "";
  return `${base}${prefix}/${p}`;
}

/** Base URL up to api/mobile – use for mobile APIs (customerLogin, customerSignup, customerUpdate). */
export const API_MOBILE_BASE_URL = `${API_BASE_URL.replace(/\/$/, "")}/api/mobile`;

/** Full URL for a mobile API endpoint (e.g. "customerLogin" => base + "/api/mobile/customerLogin") */
export function apiMobileUrl(endpoint: string): string {
  const base = API_MOBILE_BASE_URL.replace(/\/$/, "");
  const p = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  return `${base}/${p}`;
}

/**
 * Resolve notification image URL so it's reachable from the mobile device.
 * Converts relative paths (storage/...) to full URLs using API base.
 */
export function resolveNotificationImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const base = API_BASE_URL.replace(/\/$/, "");
    if (trimmed.startsWith("storage/") || trimmed.startsWith("/storage/")) {
      const path = trimmed.startsWith("/") ? trimmed : "/" + trimmed;
      return `${base}${path}`;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}
