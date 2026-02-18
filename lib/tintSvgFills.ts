/**
 * Tint SVG path fills: multiply each path's fill (gray) by the user's color
 * so the result keeps natural shading with the selected hue.
 */

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Multiply user color by gray (0–255) per channel → tinted color with shading. */
export function tintHex(userColor: string, grayHex: string): string {
  const [uR, uG, uB] = parseHex(userColor);
  const [gR, gG, gB] = parseHex(grayHex);
  return toHex(
    (uR * gR) / 255,
    (uG * gG) / 255,
    (uB * gB) / 255
  );
}

const TINT_CACHE_MAX = 40;
const tintCache = new Map<string, string>();

function quickHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return h >>> 0;
}

function tintCacheKey(svgString: string, userColor: string): string {
  return `${userColor}:${svgString.length}:${quickHash(svgString)}`;
}

/** Replace every fill="#XXXXXX" in SVG string with tint(userColor, that gray). Cached for speed. */
export function tintSvgFills(svgString: string, userColor: string): string {
  const key = tintCacheKey(svgString, userColor);
  const cached = tintCache.get(key);
  if (cached !== undefined) return cached;

  const [uR, uG, uB] = parseHex(userColor);
  const uniqueHexes = [...new Set(svgString.match(/fill="(#[0-9a-fA-F]{6})"/g) ?? [])].map((m) => m.slice(6, -1));
  const tintMap = new Map<string, string>();
  for (const grayHex of uniqueHexes) {
    const [gR, gG, gB] = parseHex(grayHex);
    tintMap.set(grayHex, toHex((uR * gR) / 255, (uG * gG) / 255, (uB * gB) / 255));
  }
  const result = svgString.replace(
    /fill="(#[0-9a-fA-F]{6})"/g,
    (m, grayHex) => `fill="${tintMap.get(grayHex) ?? grayHex}"`
  );
  if (tintCache.size >= TINT_CACHE_MAX) {
    const first = tintCache.keys().next().value;
    if (first !== undefined) tintCache.delete(first);
  }
  tintCache.set(key, result);
  return result;
}

/**
 * Ensure root <svg> has viewBox and preserveAspectRatio so the graphic scales to FIT
 * inside the render box (no cropping). Call before passing to SvgXml.
 */
export function ensureSvgFits(svgString: string): string {
  const openTag = svgString.match(/<svg\s[^>]*>/);
  if (!openTag) return svgString;
  const tag = openTag[0];
  const wMatch = tag.match(/width="(\d+)"/);
  const hMatch = tag.match(/height="(\d+)"/);
  if (!wMatch || !hMatch) return svgString;
  const w = wMatch[1];
  const h = hMatch[1];
  const viewBox = `viewBox="0 0 ${w} ${h}"`;
  const ratio = `preserveAspectRatio="xMidYMid meet"`;
  if (tag.includes("viewBox=") && tag.includes("preserveAspectRatio=")) return svgString;
  const insert = [viewBox, ratio].filter((x) => !tag.includes(x.split("=")[0])).join(" ");
  if (!insert) return svgString;
  return svgString.replace(/<svg\s([^>]*)>/, (_, attrs) => `<svg ${attrs} ${insert}>`);
}
