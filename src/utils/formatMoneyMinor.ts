/** Formats integer minor units without floating-point drift in the stored value. */
export function formatMoneyMinor(minor: number, currency = 'USD', fractionDigits = 0): string {
  const safe = Number.isFinite(minor) ? Math.round(minor) : 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(safe / 100);
  } catch {
    return `${(safe / 100).toFixed(fractionDigits)} ${currency}`;
  }
}

export function formatPercent(ratio: number): string {
  return `${Math.round((Number.isFinite(ratio) ? ratio : 0) * 100)}%`;
}
