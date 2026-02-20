/**
 * Format price for display in Ks (e.g. 12,000 Ks, 13,500 Ks).
 * Rounds to integer, no decimals, with thousands separator.
 */
export function formatPriceMMK(price: string | number): string {
  const n = Math.round(Number(price));
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) + " Ks";
}
