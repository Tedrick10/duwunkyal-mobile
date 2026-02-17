/**
 * API Base URL – Set EXPO_PUBLIC_API_BASE_URL in .env or change default below.
 * Optional: EXPO_PUBLIC_API_PREFIX (e.g. "api") for paths like /api/mobile/customerLogin.
 */
const envBase = process.env.EXPO_PUBLIC_API_BASE_URL;
const envDomain = process.env.EXPO_PUBLIC_DOMAIN;

function fromDomain(): string {
  if (!envDomain || envDomain === "undefined" || envDomain === "null") {
    // return "http://localhost";
    return "http://192.168.1.2:8000";
  }
  const protocol =
    envDomain.startsWith("localhost") || envDomain.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${envDomain}`.replace(/\/$/, "");
}

export const API_BASE_URL =
  envBase && envBase !== "undefined" && envBase !== "null"
    ? envBase.replace(/\/$/, "")
    : fromDomain();

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
