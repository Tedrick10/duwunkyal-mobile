/**
 * Callback fired when API returns 401/403 (e.g. account deactivated, token invalid).
 * AuthProvider registers logout; triggers auto-logout when backend deactivates user.
 */
let handler: (() => void) | null = null;

export function setOnUnauthorized(fn: () => void | Promise<void>) {
  handler = fn;
}

export async function triggerUnauthorized(): Promise<void> {
  if (handler) {
    await handler();
  }
}
