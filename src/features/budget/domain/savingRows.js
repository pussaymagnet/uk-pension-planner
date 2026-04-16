/**
 * Normalized planned savings rows (Budget → mirror → Projection).
 * allocationType: where monthly amount is routed in projection (cash vs stocks).
 */

/** @param {unknown} v */
export function normalizeAllocationType(v) {
  return v === 'stocks' ? 'stocks' : 'cash';
}

/**
 * @param {unknown} r
 * @returns {{ id: string, name: string, amount: number, allocationType: 'cash' | 'stocks' }}
 */
export function normalizeSavingRow(r) {
  if (r == null || typeof r !== 'object') {
    return { id: '', name: '', amount: 0, allocationType: 'cash' };
  }
  const o = /** @type {Record<string, unknown>} */ (r);
  return {
    id: String(o.id ?? ''),
    name: typeof o.name === 'string' ? o.name : '',
    amount: Number(o.amount) || 0,
    allocationType: normalizeAllocationType(o.allocationType),
  };
}
