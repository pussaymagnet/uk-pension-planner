/**
 * Projection tab — Supabase I/O only (`projection_inputs`). Normalizes on read/write via
 * {@link normalizeProjectionInputs}. Device mirror stays in `App.jsx` (`STORAGE_KEY_PROJECTION`).
 */

import { supabase } from '../lib/supabase';
import { normalizeProjectionInputs } from './projectionDefaults.js';

const TABLE = 'projection_inputs';

/**
 * @param {string} userId
 * @returns {Promise<
 *   | { ok: true, bundle: { inputs: import('./projectionSummary.js').ProjectionInputs } | null }
 *   | { ok: false }
 * >}
 */
export async function fetchProjectionInputsForUser(userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('inputs, last_updated_at_ms, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { ok: false };
  if (!data) return { ok: true, bundle: null };

  const inputs = normalizeProjectionInputs(data.inputs);
  return { ok: true, bundle: { inputs } };
}

/**
 * @param {string} userId
 * @param {import('./projectionSummary.js').ProjectionInputs} inputs
 * @returns {Promise<{ ok: boolean }>}
 */
export async function upsertProjectionInputsForUser(userId, inputs) {
  const normalized = normalizeProjectionInputs(inputs);
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      inputs: normalized,
      last_updated_at_ms: Date.now(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) return { ok: false };
  return { ok: true };
}
