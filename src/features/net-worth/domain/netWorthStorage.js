/**
 * Net worth persisted inputs — serialization, normalization, and raw read helpers.
 * **Device mirror**: `netWorthLocalPersistenceAdapter` in `./netWorthPersistenceAdapter.js`.
 * **Signed-in sync**: `netWorthSupabase.js` (`net_worth_inputs` table) plus the same mirror — see `App.jsx`.
 *
 * **Canonical app state** (`netWorthInputs` in `App.jsx`) is exactly:
 * - `assets`: `propertyValue`, `cash`, `stocksAndShares`, `pensionHoldings` (numbers ≥ 0).
 * - `liabilities`: `loans`, `creditCards` only — **mortgage is not stored** (Budget mirror is the source of truth).
 *
 * **Legacy payloads** may still include `liabilities.mortgageBalance`. On load/import we read it **only** for
 * {@link migrateLegacyPropertyAssets} (property value recovery), then **drop** it from normalized state so the next
 * save/export does not reintroduce it.
 *
 * Property **equity** is never stored: it is derived in {@link computeNetWorthSummary} as
 * `max(0, propertyValue − derivedMortgageBalance)` where mortgage comes from the Budget mirror (not `liabilities.mortgageBalance`).
 *
 * **Legacy localStorage**: older saves may have `assets.propertyEquity` without `propertyValue`.
 * That is migrated on load into `propertyValue` (equity + mortgage) and `propertyEquity` is not
 * kept in canonical state.
 *
 * **Persisted bundle** (current): `{ "inputs": { assets, liabilities }, "lastUpdatedAtMs": number | null }`.
 * Older saves stored only `{ assets, liabilities }` at the root — treated as inputs with no
 * `lastUpdatedAtMs` until the user edits again.
 *
 * **Boundaries**: canonical `inputs` are portable; `lastUpdatedAtMs` is device-local metadata until
 * a remote sync layer maps it (e.g. Supabase `updated_at`). Import JSON may be canonical `{ assets, liabilities }`
 * or a persisted bundle root `{ inputs, lastUpdatedAtMs }` — {@link parseNetWorthImportJsonText} unwraps `inputs`
 * before {@link normalizeNetWorthInputs}. Export remains canonical inputs only.
 *
 * **Sanitisation**: all numeric normalisation uses {@link sanitizeMoney} from `./netWorthMoney.js` (single source).
 */

import { sanitizeMoney } from './netWorthMoney';

/** Stable key — matches `pension-planner-*` convention used elsewhere. */
export const STORAGE_KEY_NET_WORTH = 'pension-planner-net-worth';

/** Canonical asset keys persisted in app state (not `propertyEquity`). */
export const NET_WORTH_CANONICAL_ASSET_KEYS = [
  'propertyValue',
  'cash',
  'stocksAndShares',
  'pensionHoldings',
];

/** Liability keys persisted in canonical state (manual entry only). */
export const NET_WORTH_MANUAL_LIABILITY_KEYS = ['loans', 'creditCards'];

/**
 * Legacy key sometimes present in old localStorage / Supabase / export JSON — not part of canonical state.
 * Read in {@link normalizeNetWorthInputs} for one-time migration math only.
 */
export const NET_WORTH_LEGACY_MORTGAGE_FIELD = 'mortgageBalance';

/**
 * Default canonical net worth inputs (deep-clone via {@link getDefaultNetWorthInputs} for React state).
 * @type {{ assets: Record<string, number>, liabilities: Record<string, number> }}
 */
export const DEFAULT_NET_WORTH_INPUTS = {
  assets: {
    propertyValue: 0,
    cash: 0,
    stocksAndShares: 0,
    pensionHoldings: 0,
  },
  liabilities: {
    loans: 0,
    creditCards: 0,
  },
};

/**
 * Fresh deep copy of defaults (safe for `useState` initialiser).
 * @returns {typeof DEFAULT_NET_WORTH_INPUTS}
 */
export function getDefaultNetWorthInputs() {
  return JSON.parse(JSON.stringify(DEFAULT_NET_WORTH_INPUTS));
}

/**
 * @param {unknown} obj
 * @param {readonly string[]} keys
 */
function normalizeBucket(obj, keys) {
  const o = obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  const out = {};
  for (const k of keys) {
    const v = o[k];
    if (v != null && typeof v === 'object') {
      out[k] = 0;
    } else {
      out[k] = sanitizeMoney(v);
    }
  }
  return out;
}

/**
 * Legacy saves used `assets.propertyEquity` without `propertyValue`. Recover an implied
 * `propertyValue` as equity + mortgage so totals stay coherent; `propertyEquity` is not retained.
 *
 * @param {unknown} rawAssets
 * @param {Record<string, number>} assetsOut
 * @param {number} legacyMortgageBalance — from raw `liabilities.mortgageBalance` before stripping (migration only)
 */
function migrateLegacyPropertyAssets(rawAssets, assetsOut, legacyMortgageBalance) {
  if (!rawAssets || typeof rawAssets !== 'object' || Array.isArray(rawAssets)) {
    return assetsOut;
  }
  const hasPropertyValueKey = Object.prototype.hasOwnProperty.call(rawAssets, 'propertyValue');
  if (hasPropertyValueKey) {
    return assetsOut;
  }
  const legacyEquity = sanitizeMoney(rawAssets.propertyEquity);
  if (legacyEquity <= 0) return assetsOut;
  const mb = sanitizeMoney(legacyMortgageBalance);
  return { ...assetsOut, propertyValue: legacyEquity + mb };
}

/**
 * Normalizes arbitrary persisted/API-like data into canonical `netWorthInputs` shape.
 * Missing keys → 0, invalid numbers → 0, negatives → 0. Applies legacy `propertyEquity` migration (uses legacy
 * `mortgageBalance` from raw input if present, then omits mortgage from output). Legacy `mortgageBalance` is not
 * retained — next {@link serializeNetWorthPersistedBundle} / export writes loans + credit cards only.
 *
 * @param {unknown} raw — parsed JSON or similar
 * @returns {typeof DEFAULT_NET_WORTH_INPUTS}
 */
export function normalizeNetWorthInputs(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return getDefaultNetWorthInputs();
  }
  const rawLiab =
    raw.liabilities && typeof raw.liabilities === 'object' && !Array.isArray(raw.liabilities)
      ? raw.liabilities
      : {};
  const legacyMortgageForMigration = sanitizeMoney(rawLiab[NET_WORTH_LEGACY_MORTGAGE_FIELD]);
  const liabilities = normalizeBucket(raw.liabilities, NET_WORTH_MANUAL_LIABILITY_KEYS);
  let assets = normalizeBucket(raw.assets, NET_WORTH_CANONICAL_ASSET_KEYS);
  assets = migrateLegacyPropertyAssets(raw.assets, assets, legacyMortgageForMigration);
  return { assets, liabilities };
}

/**
 * @param {unknown} ms
 * @returns {number | null}
 */
function normalizePersistedLastUpdatedMs(ms) {
  return typeof ms === 'number' && Number.isFinite(ms) && ms > 0 ? ms : null;
}

/**
 * @param {string | null | undefined} jsonString
 * @returns {unknown | null}
 */
function tryParseJsonString(jsonString) {
  if (jsonString == null || jsonString === '') return null;
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

/**
 * Parses a persisted JSON string for net worth. Returns `null` if empty or invalid JSON.
 * @param {string | null} jsonString
 * @returns {unknown | null}
 */
export function parsePersistedNetWorthJsonString(jsonString) {
  return tryParseJsonString(jsonString);
}

/**
 * @param {unknown} candidate
 * @returns {boolean}
 */
function isValidNetWorthImportCandidate(candidate) {
  if (candidate == null || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
  const hasA = Object.prototype.hasOwnProperty.call(candidate, 'assets');
  const hasL = Object.prototype.hasOwnProperty.call(candidate, 'liabilities');
  if (!hasA && !hasL) return false;
  if (hasA && (candidate.assets === null || typeof candidate.assets !== 'object' || Array.isArray(candidate.assets))) {
    return false;
  }
  if (
    hasL &&
    (candidate.liabilities === null || typeof candidate.liabilities !== 'object' || Array.isArray(candidate.liabilities))
  ) {
    return false;
  }
  return true;
}

/**
 * Parses JSON text from a user-selected import file. Supports:
 * - Canonical `{ assets, liabilities }`
 * - Persisted bundle `{ inputs: { assets, liabilities }, lastUpdatedAtMs? }` — unwraps `inputs` before normalization
 *
 * Returns a plain object suitable for {@link normalizeNetWorthInputs}, or `null` if JSON is invalid or the shape
 * is not a recognizable net worth inputs payload.
 *
 * @param {string} text
 * @returns {Record<string, unknown> | null}
 */
export function parseNetWorthImportJsonText(text) {
  if (typeof text !== 'string') return null;
  const parsed = tryParseJsonString(text);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  if (parsed.inputs != null && typeof parsed.inputs === 'object' && !Array.isArray(parsed.inputs)) {
    return isValidNetWorthImportCandidate(parsed.inputs) ? parsed.inputs : null;
  }

  return isValidNetWorthImportCandidate(parsed) ? parsed : null;
}

/**
 * Serializes canonical inputs only (no metadata). Useful for API payloads; local device storage
 * uses {@link serializeNetWorthPersistedBundle}.
 *
 * @param {typeof DEFAULT_NET_WORTH_INPUTS} canonicalInputs
 * @returns {string}
 */
export function serializeNetWorthInputs(canonicalInputs) {
  return JSON.stringify(canonicalInputs);
}

/**
 * Serializes canonical inputs plus local metadata for device storage (not part of import/export JSON).
 *
 * @param {{ inputs: typeof DEFAULT_NET_WORTH_INPUTS, lastUpdatedAtMs: number | null }} bundle
 * @returns {string}
 */
export function serializeNetWorthPersistedBundle(bundle) {
  const { inputs, lastUpdatedAtMs } = bundle;
  return JSON.stringify({ inputs, lastUpdatedAtMs: normalizePersistedLastUpdatedMs(lastUpdatedAtMs) });
}

/**
 * Interprets parsed localStorage JSON: new bundle shape, or legacy root-level inputs only.
 *
 * @param {unknown} parsed
 * @returns {{ inputs: typeof DEFAULT_NET_WORTH_INPUTS, lastUpdatedAtMs: number | null }}
 */
function parsePersistedNetWorthRecord(parsed) {
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { inputs: getDefaultNetWorthInputs(), lastUpdatedAtMs: null };
  }
  if (parsed.inputs != null && typeof parsed.inputs === 'object' && !Array.isArray(parsed.inputs)) {
    const inputs = normalizeNetWorthInputs(parsed.inputs);
    return { inputs, lastUpdatedAtMs: normalizePersistedLastUpdatedMs(parsed.lastUpdatedAtMs) };
  }
  if (Object.prototype.hasOwnProperty.call(parsed, 'assets') || Object.prototype.hasOwnProperty.call(parsed, 'liabilities')) {
    return { inputs: normalizeNetWorthInputs(parsed), lastUpdatedAtMs: null };
  }
  return { inputs: getDefaultNetWorthInputs(), lastUpdatedAtMs: null };
}

/**
 * UK-style compact display for a local edit timestamp (not used in calculations).
 *
 * @param {number | null | undefined} ms — epoch milliseconds
 * @returns {string | null} Formatted string, or `null` if not displayable
 */
export function formatNetWorthLastUpdatedAt(ms) {
  if (ms == null || !Number.isFinite(ms)) return null;
  const d = new Date(ms);
  const t = d.getTime();
  if (!Number.isFinite(t)) return null;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Read raw persisted string (browser localStorage). Separated so a future sync layer can swap the source.
 * @returns {string | null}
 */
export function readPersistedNetWorthRaw() {
  try {
    return localStorage.getItem(STORAGE_KEY_NET_WORTH);
  } catch {
    return null;
  }
}

/**
 * Hydration path: raw storage → parse → {@link normalizeNetWorthInputs} + optional `lastUpdatedAtMs`.
 * Safe to call during `useState` lazy init (browser only).
 *
 * @returns {{ inputs: typeof DEFAULT_NET_WORTH_INPUTS, lastUpdatedAtMs: number | null }}
 */
export function loadNetWorthPersistedFromStorage() {
  try {
    const rawString = readPersistedNetWorthRaw();
    const parsed = parsePersistedNetWorthJsonString(rawString);
    if (parsed === null) return { inputs: getDefaultNetWorthInputs(), lastUpdatedAtMs: null };
    return parsePersistedNetWorthRecord(parsed);
  } catch {
    return { inputs: getDefaultNetWorthInputs(), lastUpdatedAtMs: null };
  }
}

