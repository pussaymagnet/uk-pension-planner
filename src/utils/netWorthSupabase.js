/**
 * Net Worth — Supabase I/O only (`net_worth_inputs`). No normalization rules beyond
 * {@link normalizeNetWorthInputs} on read. Both functions return `{ ok: boolean, ... }`:
 * {@link fetchNetWorthBundleForUser} includes `bundle` when `ok: true`; {@link upsertNetWorthBundleForUser}
 * returns `{ ok: true }` or `{ ok: false }` on failure. **localStorage** remains the device fallback via
 * {@link netWorthLocalPersistenceAdapter}.
 */

import { supabase } from '../lib/supabase';
import { normalizeNetWorthInputs } from './netWorthStorage';

const TABLE = 'net_worth_inputs';

/**
 * @param {string} userId
 * @returns {Promise<
 *   | { ok: true, bundle: { inputs: object, lastUpdatedAtMs: number | null } | null }
 *   | { ok: false }
 * >}
 */
export async function fetchNetWorthBundleForUser(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('inputs, last_updated_at_ms, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { ok: false };
  if (!data) return { ok: true, bundle: null };

  const inputs = normalizeNetWorthInputs(data.inputs);
  let lastUpdatedAtMs =
    typeof data.last_updated_at_ms === 'number' &&
    Number.isFinite(data.last_updated_at_ms) &&
    data.last_updated_at_ms > 0
      ? data.last_updated_at_ms
      : null;
  if (lastUpdatedAtMs == null && data.updated_at) {
    const t = new Date(data.updated_at).getTime();
    if (Number.isFinite(t)) lastUpdatedAtMs = t;
  }
  return { ok: true, bundle: { inputs, lastUpdatedAtMs } };
}

/**
 * @param {string} userId
 * @param {{ inputs: object, lastUpdatedAtMs: number | null }} bundle
 * @returns {Promise<{ ok: boolean }>}
 */
export async function upsertNetWorthBundleForUser(userId, bundle) {
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      inputs: bundle.inputs,
      last_updated_at_ms: bundle.lastUpdatedAtMs,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) {
    // Caller may show persistence status; local mirror still holds data.
    return { ok: false };
  }
  return { ok: true };
}
