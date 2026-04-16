/**
 * Single source for net worth numeric sanitisation (persisted data, imports, UI text → state).
 * Used by `netWorthStorage` (normalisation) and `netWorthSummary` (derived maths / display).
 */

/**
 * Non-negative finite number from arbitrary input; empty or invalid → 0.
 * @param {unknown} v
 * @returns {number}
 */
export function sanitizeMoney(v) {
  if (v === '' || v == null) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

/**
 * Normalises raw currency field text to a non-negative finite number for state.
 * Empty or invalid input becomes 0; strips thousands separators (commas) from string input.
 *
 * @param {string | number} raw
 * @returns {number}
 */
export function parsePoundsInput(raw) {
  if (raw === '' || raw == null) return 0;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return 0;
    return Math.max(0, raw);
  }
  const s = String(raw).trim().replace(/,/g, '');
  if (s === '' || s === '-' || s === '+') return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}
