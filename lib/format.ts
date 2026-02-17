/**
 * Format price for display in MMK (e.g. 12000, 13,500).
 * Rounds to integer, no decimals, with thousands separator.
 */
export function formatPriceMMK(price: string | number): string {
  const n = Math.round(Number(price));
  return "MMK " + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
