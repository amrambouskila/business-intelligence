/** Format a number with locale-aware separators. */
export function formatNumber(n: number, decimals = 2): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
}
