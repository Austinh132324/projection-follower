/** Odds conversions shared across book scrapers, so payout math is consistent. */

export function americanToDecimal(american: number): number {
  if (american === 0) return 1;
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
}

export function decimalToAmerican(decimal: number): number {
  if (decimal <= 1) return 0;
  const profit = decimal - 1;
  return profit >= 1 ? Math.round(profit * 100) : Math.round(-100 / profit);
}

/** Total return (stake + profit) for a winning bet at the given American odds. */
export function potentialPayoutFromAmerican(stake: number, american: number): number {
  return round2(stake * americanToDecimal(american));
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
