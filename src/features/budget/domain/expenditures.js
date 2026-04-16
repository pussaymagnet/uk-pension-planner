import { getEffectiveExpenditureAmount } from './mortgageExpenditure';

/** Household cost section: essential costs vs flexible spending (stored as fixed / niceToHave) */
export const SECTION_FIXED = 'fixed';
export const SECTION_NICE = 'niceToHave';

/**
 * Stable semantic type for an expenditure row. Drives future behavior (mortgage wizard, etc.).
 * UI grouping still uses `section` (Essential vs Flexible).
 */
export const EXPENDITURE_CATEGORY = {
  HOUSING_RENT: 'housing_rent',
  HOUSING_MORTGAGE: 'housing_mortgage',
  UTILITY: 'utility',
  COUNCIL_TAX: 'council_tax',
  INSURANCE: 'insurance',
  SUBSCRIPTION: 'subscription',
  PHONE: 'phone',
  OTHER: 'other',
};

/** Display order for category dropdowns */
export const EXPENDITURE_CATEGORY_SELECT_ORDER = Object.freeze([
  EXPENDITURE_CATEGORY.HOUSING_RENT,
  EXPENDITURE_CATEGORY.HOUSING_MORTGAGE,
  EXPENDITURE_CATEGORY.UTILITY,
  EXPENDITURE_CATEGORY.COUNCIL_TAX,
  EXPENDITURE_CATEGORY.INSURANCE,
  EXPENDITURE_CATEGORY.PHONE,
  EXPENDITURE_CATEGORY.SUBSCRIPTION,
  EXPENDITURE_CATEGORY.OTHER,
]);

export const DEFAULT_EXPENDITURE_CATEGORY = EXPENDITURE_CATEGORY.OTHER;

/** User-facing labels for category pickers (English). */
export const EXPENDITURE_CATEGORY_LABELS = {
  [EXPENDITURE_CATEGORY.HOUSING_RENT]: 'Rent',
  [EXPENDITURE_CATEGORY.HOUSING_MORTGAGE]: 'Mortgage',
  [EXPENDITURE_CATEGORY.UTILITY]: 'Utility (e.g. electricity)',
  [EXPENDITURE_CATEGORY.COUNCIL_TAX]: 'Council tax',
  [EXPENDITURE_CATEGORY.INSURANCE]: 'Insurance',
  [EXPENDITURE_CATEGORY.SUBSCRIPTION]: 'Subscription',
  [EXPENDITURE_CATEGORY.PHONE]: 'Phone / broadband',
  [EXPENDITURE_CATEGORY.OTHER]: 'Other',
};

/** @returns {{ value: string, label: string }[]} */
export function getExpenditureCategorySelectOptions() {
  return EXPENDITURE_CATEGORY_SELECT_ORDER.map((c) => ({
    value: c,
    label: EXPENDITURE_CATEGORY_LABELS[c] ?? c,
  }));
}

const VALID_CATEGORY = new Set(Object.values(EXPENDITURE_CATEGORY));

/** @param {unknown} c */
export function isValidExpenditureCategory(c) {
  return typeof c === 'string' && VALID_CATEGORY.has(c);
}

/** Known starter row ids → category (migration only). */
const SEED_ID_TO_CATEGORY = {
  'seed-fixed-rent': EXPENDITURE_CATEGORY.HOUSING_RENT,
  'seed-fixed-electricity': EXPENDITURE_CATEGORY.UTILITY,
  'seed-fixed-council': EXPENDITURE_CATEGORY.COUNCIL_TAX,
  'seed-fixed-car-ins': EXPENDITURE_CATEGORY.INSURANCE,
  'seed-fixed-pet-ins': EXPENDITURE_CATEGORY.INSURANCE,
  'seed-nice-phone': EXPENDITURE_CATEGORY.PHONE,
  'seed-nice-subs': EXPENDITURE_CATEGORY.SUBSCRIPTION,
};

/** Legacy display names (normalized) → category when id unknown. */
const LEGACY_NAME_TO_CATEGORY = {
  'mortgage or rent': EXPENDITURE_CATEGORY.HOUSING_RENT,
  electricity: EXPENDITURE_CATEGORY.UTILITY,
  'council tax': EXPENDITURE_CATEGORY.COUNCIL_TAX,
  'car insurance': EXPENDITURE_CATEGORY.INSURANCE,
  'pet insurance': EXPENDITURE_CATEGORY.INSURANCE,
  'phone bill': EXPENDITURE_CATEGORY.PHONE,
  subscription: EXPENDITURE_CATEGORY.SUBSCRIPTION,
};

const r2 = (n) => Math.round((n ?? 0) * 100) / 100;

/**
 * Infer category for rows saved before `category` existed.
 * Does not use fuzzy matching beyond exact legacy names — unknown → `other`.
 *
 * @param {{ id?: string, name?: string, category?: string }} r
 * @returns {string}
 */
export function inferExpenditureCategoryFromLegacy(r) {
  const id = String(r.id ?? '');
  if (SEED_ID_TO_CATEGORY[id]) return SEED_ID_TO_CATEGORY[id];
  const nameKey = String(r.name ?? '')
    .trim()
    .toLowerCase();
  if (nameKey && LEGACY_NAME_TO_CATEGORY[nameKey]) return LEGACY_NAME_TO_CATEGORY[nameKey];
  return DEFAULT_EXPENDITURE_CATEGORY;
}

/** @param {unknown} raw */
function normalizeExpenditureMetadata(raw) {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return { ...raw };
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return typeof p === 'object' && p != null && !Array.isArray(p) ? p : {};
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Default monthly budget lines — UX scaffolding only; meaning is explicit via `category`.
 */
export function createDefaultExpenditures() {
  return [
    {
      id: 'seed-fixed-rent',
      name: 'Mortgage or rent',
      amount: 0,
      partner1Pct: 100,
      section: SECTION_FIXED,
      category: EXPENDITURE_CATEGORY.HOUSING_RENT,
      metadata: {},
    },
    {
      id: 'seed-fixed-electricity',
      name: 'Electricity',
      amount: 0,
      partner1Pct: 100,
      section: SECTION_FIXED,
      category: EXPENDITURE_CATEGORY.UTILITY,
      metadata: {},
    },
    {
      id: 'seed-fixed-council',
      name: 'Council tax',
      amount: 0,
      partner1Pct: 100,
      section: SECTION_FIXED,
      category: EXPENDITURE_CATEGORY.COUNCIL_TAX,
      metadata: {},
    },
    {
      id: 'seed-fixed-car-ins',
      name: 'Car insurance',
      amount: 0,
      partner1Pct: 100,
      section: SECTION_FIXED,
      category: EXPENDITURE_CATEGORY.INSURANCE,
      metadata: {},
    },
    {
      id: 'seed-fixed-pet-ins',
      name: 'Pet insurance',
      amount: 0,
      partner1Pct: 100,
      section: SECTION_FIXED,
      category: EXPENDITURE_CATEGORY.INSURANCE,
      metadata: {},
    },
    {
      id: 'seed-nice-phone',
      name: 'Phone bill',
      amount: 0,
      partner1Pct: 100,
      section: SECTION_NICE,
      category: EXPENDITURE_CATEGORY.PHONE,
      metadata: {},
    },
    {
      id: 'seed-nice-subs',
      name: 'Subscription',
      amount: 0,
      partner1Pct: 100,
      section: SECTION_NICE,
      category: EXPENDITURE_CATEGORY.SUBSCRIPTION,
      metadata: {},
    },
  ];
}

/**
 * Normalize a row from API or localStorage.
 * `name` remains the user-editable label (refactor spec used "label"; we keep `name` for compatibility).
 *
 * @param {unknown} r
 * @returns {{
 *   id: string,
 *   name: string,
 *   amount: number,
 *   partner1Pct: number,
 *   section: string,
 *   category: string,
 *   metadata: Record<string, unknown>,
 * }}
 */
export function normalizeExpenditureRow(r) {
  if (r == null || typeof r !== 'object') {
    return {
      id: '',
      name: '',
      amount: 0,
      partner1Pct: 100,
      section: SECTION_FIXED,
      category: DEFAULT_EXPENDITURE_CATEGORY,
      metadata: {},
    };
  }
  const o = /** @type {Record<string, unknown>} */ (r);
  const section = o.section === SECTION_NICE ? SECTION_NICE : SECTION_FIXED;

  const rawCat = o.category ?? o.expenditure_category;
  let category =
    typeof rawCat === 'string' && rawCat ? rawCat : inferExpenditureCategoryFromLegacy(o);
  if (!isValidExpenditureCategory(category)) {
    category = inferExpenditureCategoryFromLegacy(o);
  }

  const row = {
    id: String(o.id ?? ''),
    name: typeof o.name === 'string' ? o.name : '',
    amount: r2(Number(o.amount) || 0),
    partner1Pct: r2(Number(o.partner1_pct ?? o.partner1Pct) ?? 100),
    section,
    category,
    metadata: normalizeExpenditureMetadata(o.metadata ?? o.expenditure_metadata),
  };
  if (category === EXPENDITURE_CATEGORY.HOUSING_MORTGAGE) {
    row.amount = getEffectiveExpenditureAmount(row);
  }
  return row;
}

/**
 * Credit card row from Supabase or localStorage.
 */
export function normalizeCreditCardRow(r) {
  const aprRaw = r.apr_pct ?? r.apr;
  const aprNum = aprRaw != null && aprRaw !== '' ? Number(aprRaw) : NaN;
  return {
    id: r.id,
    name: r.name ?? '',
    totalBalance: r2(Number(r.total_balance ?? r.totalBalance) || 0),
    minimumMonthlyPayment: r2(Number(r.minimum_monthly_payment ?? r.minimumMonthlyPayment) || 0),
    ...(Number.isFinite(aprNum) ? { apr: r2(aprNum) } : {}),
    notes: typeof r.notes === 'string' ? r.notes : r.notes != null ? String(r.notes) : '',
  };
}
