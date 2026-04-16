/**
 * Net Worth — **device `localStorage` only** (I/O, no business rules).
 *
 * **Responsibility**: read/write the persisted bundle `{ inputs, lastUpdatedAtMs }` on this
 * device. This is always used as the **offline mirror** so Net Worth stays usable without
 * sign-in or when Supabase fails.
 *
 * **Remote sync** (`net_worth_inputs` table): load/save when authenticated is orchestrated in
 * `App.jsx` via `fetchNetWorthBundleForUser` / `upsertNetWorthBundleForUser` in
 * `netWorthSupabase.js`. The device mirror below stays on regardless of sync success.
 *
 * **Canonical app state** remains in React (`netWorthInputs`, `netWorthLastUpdatedAtMs`).
 * **Derived** totals and insights live in `netWorthSummary.js`. Import/export file flows use
 * {@link normalizeNetWorthInputs} / {@link parseNetWorthImportJsonText} directly — not routed here.
 *
 * **Storage status line** (sync vs local vs error): `deriveNetWorthStorageStatus` in
 * `./netWorthPersistenceStatus.js` — separate from canonical inputs and from summary maths.
 *
 * Persisted snapshots use {@link loadNetWorthPersistedFromStorage} / bundle serialisation — same
 * canonical normalisation path as file import and Supabase (`normalizeNetWorthInputs`, `sanitizeMoney`).
 */

import {
  loadNetWorthPersistedFromStorage,
  serializeNetWorthPersistedBundle,
  STORAGE_KEY_NET_WORTH,
} from '../domain/netWorthStorage.js';

/**
 * Persisted snapshot: canonical inputs plus optional edit timestamp (metadata).
 * @typedef {{ inputs: { assets: Record<string, number>, liabilities: Record<string, number> }, lastUpdatedAtMs: number | null }} NetWorthPersistedBundle
 */

/**
 * Load canonical inputs and device metadata from `localStorage`.
 * @returns {NetWorthPersistedBundle}
 */
function loadNetWorthPersistedBundle() {
  return loadNetWorthPersistedFromStorage();
}

/**
 * Persist canonical inputs and metadata to `localStorage`. Failures (quota, private mode) are swallowed.
 *
 * @param {NetWorthPersistedBundle} bundle
 */
function saveNetWorthPersistedBundle(bundle) {
  try {
    localStorage.setItem(
      STORAGE_KEY_NET_WORTH,
      serializeNetWorthPersistedBundle(bundle),
    );
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Device-local mirror (`pension-planner-net-worth`). Always on; not a substitute for remote row.
 * @type {{ load: typeof loadNetWorthPersistedBundle, save: typeof saveNetWorthPersistedBundle }}
 */
export const netWorthLocalPersistenceAdapter = {
  load: loadNetWorthPersistedBundle,
  save: saveNetWorthPersistedBundle,
};

/** Alias of {@link netWorthLocalPersistenceAdapter} (local device mirror). */
export const netWorthPersistenceAdapter = netWorthLocalPersistenceAdapter;
