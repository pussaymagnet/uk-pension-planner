/**
 * Default and normalisation for Projection tab inputs (device localStorage mirror in App).
 */

/** localStorage key — mirrored offline like pension inputs */
export const STORAGE_KEY_PROJECTION = 'pension-planner-projection';

/** @type {Record<string, number>} */
export const DEFAULT_PROJECTION_INPUTS = {
  projectionYears: 10,
  /** Whole-number percent, e.g. 5 means 5% */
  pensionGrowthAnnualPct: 5,
  investmentGrowthAnnualPct: 5,
  cashGrowthAnnualPct: 1,
  /** Applied to pension contributions and budget savings additions year-on-year */
  contributionEscalationAnnualPct: 2,
  /** Applied to property value only (liabilities unchanged in v1) */
  inflationAnnualPct: 2,
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/**
 * @param {unknown} raw
 * @returns {import('./projectionSummary.js').ProjectionInputs}
 */
/** Read device mirror; safe on SSR / missing storage */
export function loadProjectionInputsFromStorage() {
  if (typeof localStorage === 'undefined') {
    return normalizeProjectionInputs({});
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTION);
    if (raw) return normalizeProjectionInputs(JSON.parse(raw));
  } catch {
    // ignore
  }
  return normalizeProjectionInputs({});
}

export function normalizeProjectionInputs(raw) {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const num = (v, d) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };
  return {
    projectionYears: Math.round(clamp(num(o.projectionYears, DEFAULT_PROJECTION_INPUTS.projectionYears), 1, 40)),
    pensionGrowthAnnualPct: clamp(num(o.pensionGrowthAnnualPct, DEFAULT_PROJECTION_INPUTS.pensionGrowthAnnualPct), -50, 50),
    investmentGrowthAnnualPct: clamp(
      num(o.investmentGrowthAnnualPct, DEFAULT_PROJECTION_INPUTS.investmentGrowthAnnualPct),
      -50,
      50,
    ),
    cashGrowthAnnualPct: clamp(num(o.cashGrowthAnnualPct, DEFAULT_PROJECTION_INPUTS.cashGrowthAnnualPct), -50, 50),
    contributionEscalationAnnualPct: clamp(
      num(o.contributionEscalationAnnualPct, DEFAULT_PROJECTION_INPUTS.contributionEscalationAnnualPct),
      -50,
      50,
    ),
    inflationAnnualPct: clamp(num(o.inflationAnnualPct, DEFAULT_PROJECTION_INPUTS.inflationAnnualPct), -50, 50),
  };
}
