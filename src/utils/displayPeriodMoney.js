/**
 * Display-only conversion of annual £ amounts to the period shown in the UI.
 * Matches InputForm: monthly = round2(annual / 12).
 *
 * @param {number} annual
 * @param {'annual' | 'monthly'} [displayPeriod='annual']
 * @returns {number}
 */
export function annualAmountForDisplay(annual, displayPeriod = 'annual') {
  const n = Number(annual) || 0;
  const r2 = (x) => Math.round(x * 100) / 100;
  if (displayPeriod === 'monthly') {
    return r2(n / 12);
  }
  return r2(n);
}
