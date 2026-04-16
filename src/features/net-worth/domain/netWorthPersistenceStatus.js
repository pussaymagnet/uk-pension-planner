/**
 * Net Worth persistence **display status** — separate from canonical `netWorthInputs` and from
 * derived totals (`netWorthSummary`). Combines auth, env, load gate, and remote error flags set
 * in `App.jsx` after {@link fetchNetWorthBundleForUser} / {@link upsertNetWorthBundleForUser}.
 */

/** @typedef {'local' | 'synced' | 'sync_unavailable' | 'sync_error'} NetWorthStorageStatus */

export const NET_WORTH_STORAGE_STATUS = {
  LOCAL: 'local',
  SYNCED: 'synced',
  SYNC_UNAVAILABLE: 'sync_unavailable',
  SYNC_ERROR: 'sync_error',
};

/**
 * Same env check as `src/lib/supabase.js` (client still instantiates without credentials).
 */
export function isSupabaseEnvConfiguredForNetWorth() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

/**
 * @param {{
 *   hasUser: boolean,
 *   supabaseConfigured: boolean,
 *   remoteLoadReady: boolean,
 *   remoteFetchFailed: boolean,
 *   remoteUpsertFailed: boolean,
 * }} p
 * @returns {NetWorthStorageStatus}
 */
export function deriveNetWorthStorageStatus(p) {
  if (!p.hasUser) return NET_WORTH_STORAGE_STATUS.LOCAL;
  if (!p.supabaseConfigured) return NET_WORTH_STORAGE_STATUS.SYNC_UNAVAILABLE;
  if (!p.remoteLoadReady) return NET_WORTH_STORAGE_STATUS.SYNC_UNAVAILABLE;
  if (p.remoteFetchFailed || p.remoteUpsertFailed) return NET_WORTH_STORAGE_STATUS.SYNC_ERROR;
  return NET_WORTH_STORAGE_STATUS.SYNCED;
}

/**
 * @param {NetWorthStorageStatus} status
 * @returns {string} `labelMap` key
 */
export function labelKeyForNetWorthStorageStatus(status) {
  switch (status) {
    case NET_WORTH_STORAGE_STATUS.SYNCED:
      return 'net_worth_storage_synced';
    case NET_WORTH_STORAGE_STATUS.SYNC_UNAVAILABLE:
      return 'net_worth_storage_sync_unavailable';
    case NET_WORTH_STORAGE_STATUS.SYNC_ERROR:
      return 'net_worth_storage_sync_error';
    case NET_WORTH_STORAGE_STATUS.LOCAL:
    default:
      return 'net_worth_storage_local';
  }
}
