/**
 * Format price for display in MMK (e.g. 12000, 13,500).
 * Rounds to integer and adds thousands separator.
 */
export function formatPriceMMK(price: string | number): string {
  const n = Math.round(Number(price)) * 1000;
  return "MMK " + n.toLocaleString();
}
