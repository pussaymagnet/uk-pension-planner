/**
 * Budget cross-tab mirror — canonical adapter boundary.
 *
 * Feature-internal rows persist under `persistence/keys` (BudgetProvider).
 * Non-Budget code reads **only** via `readBudgetMirror` / selector helpers, or clears device data with `clearBudgetLocalStorageForSignOut`.
 * Legacy row keys are read here for migration when the canonical mirror is missing or invalid.
 */
import { calculateAmortizingMonthlyPayment } from '../../../utils/debt';
import {
  SECTION_FIXED,
  SECTION_NICE,
  createDefaultExpenditures,
  normalizeCreditCardRow,
  normalizeExpenditureRow,
} from './expenditures';
import {
  buildMortgageSummaryFromExpenditures,
  getEffectiveExpenditureAmount,
  normalizeMortgageMirrorSlice,
} from './mortgageExpenditure';
import { normalizeGoalSavingRow } from './goalRows';
import { normalizeAllocationType, normalizeSavingRow } from './savingRows';
import {
  STORAGE_KEY,
  STORAGE_KEY_DEBTS,
  STORAGE_KEY_SAVINGS,
  STORAGE_KEY_CREDIT_CARDS,
  STORAGE_KEY_GOAL_SAVINGS,
  STORAGE_KEY_UNEXPECTED_BUFFER,
} from '../persistence/keys';

const r2 = (n) => Math.round((n ?? 0) * 100) / 100;

/** Canonical JSON blob for other tabs (Net Worth insights, Projection snapshot, App shell). */
export const BUDGET_MIRROR_STORAGE_KEY = 'pension-planner-budget-mirror';

/** All Budget device persistence keys (row mirrors + buffer + canonical). Sign-out clears this list; shell does not hardcode key strings. */
const BUDGET_DEVICE_STORAGE_KEYS = [
  STORAGE_KEY,
  STORAGE_KEY_DEBTS,
  STORAGE_KEY_SAVINGS,
  STORAGE_KEY_CREDIT_CARDS,
  STORAGE_KEY_GOAL_SAVINGS,
  STORAGE_KEY_UNEXPECTED_BUFFER,
  BUDGET_MIRROR_STORAGE_KEY,
];

const MIRROR_VERSION = 3;

/** @param {unknown} v @returns {number} */
function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? r2(n) : 0;
}

/** Default mirror shape — all derived numbers normalized to 2dp. */
export function defaultBudgetMirror() {
  return {
    version: MIRROR_VERSION,
    generatedAt: new Date(0).toISOString(),
    essentialMonthlyCosts: 0,
    monthlySavings: 0,
    monthlyCashSavings: 0,
    monthlyStockSavings: 0,
    /** Mortgage rows (`housing_mortgage`); multiple properties summed. */
    mortgage: {
      enabled: false,
      rows: [],
      totalBalance: 0,
      totalMonthlyPayment: 0,
    },
    breakdown: {
      plannedMonthlyOutgoings: 0,
      householdP1Total: 0,
      fixedP1Total: 0,
      niceP1Total: 0,
      debtMonthlyTotal: 0,
      creditCardMinimumTotal: 0,
      explicitSavingsTotal: 0,
      committedGoalsMonthlyTotal: 0,
    },
  };
}

/**
 * Coerce unknown JSON into a stable v1 mirror; missing fields use defaults.
 * Never throws.
 * @param {unknown} raw
 */
export function normalizeBudgetMirror(raw) {
  const base = defaultBudgetMirror();
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return base;

  const o = /** @type {Record<string, unknown>} */ (raw);
  const br = o.breakdown && typeof o.breakdown === 'object' && !Array.isArray(o.breakdown)
    ? /** @type {Record<string, unknown>} */ (o.breakdown)
    : {};

  const ver = Number(o.version);
  const isV2 = Number.isFinite(ver) && ver >= 2;

  let monthlySavings = safeNum(o.monthlySavings);
  let monthlyCashSavings = safeNum(o.monthlyCashSavings);
  let monthlyStockSavings = safeNum(o.monthlyStockSavings);

  // v1 mirror (or missing split): entire legacy total treated as cash — matches pre-split projection behavior for cash growth.
  if (!isV2) {
    monthlyCashSavings = monthlySavings;
    monthlyStockSavings = 0;
  }
  monthlySavings = r2(monthlyCashSavings + monthlyStockSavings);

  const mortRaw = o.mortgage && typeof o.mortgage === 'object' && !Array.isArray(o.mortgage) ? o.mortgage : {};
  const mortgage = normalizeMortgageMirrorSlice(mortRaw);

  return {
    version: MIRROR_VERSION,
    generatedAt: typeof o.generatedAt === 'string' && o.generatedAt ? o.generatedAt : base.generatedAt,
    essentialMonthlyCosts: safeNum(o.essentialMonthlyCosts),
    monthlySavings,
    monthlyCashSavings: r2(monthlyCashSavings),
    monthlyStockSavings: r2(monthlyStockSavings),
    mortgage,
    breakdown: {
      plannedMonthlyOutgoings: safeNum(br.plannedMonthlyOutgoings),
      householdP1Total: safeNum(br.householdP1Total),
      fixedP1Total: safeNum(br.fixedP1Total),
      niceP1Total: safeNum(br.niceP1Total),
      debtMonthlyTotal: safeNum(br.debtMonthlyTotal),
      creditCardMinimumTotal: safeNum(br.creditCardMinimumTotal),
      explicitSavingsTotal: safeNum(br.explicitSavingsTotal),
      committedGoalsMonthlyTotal: safeNum(br.committedGoalsMonthlyTotal),
    },
  };
}

const p1Amount = (exp) => r2((exp.partner1Pct / 100) * getEffectiveExpenditureAmount(exp));

/**
 * @param {Array<{ amount: number, partner1Pct: number }>} expenditures
 */
function computeHouseholdP1Total(expenditures) {
  return r2(expenditures.reduce((s, e) => s + p1Amount(e), 0));
}

/**
 * Committed savings goals are counted as cash for projection (short-term / general bucket).
 * @param {Array<{ amount?: number, allocationType?: string }>} savings
 * @param {Array<{ committed?: boolean, committedMonthlyContribution?: number }>} goalSavings
 */
export function computeMonthlySavingsSplit(savings, goalSavings) {
  let explicitCash = 0;
  let explicitStock = 0;
  for (const v of savings) {
    const amt = r2(v.amount ?? 0);
    if (normalizeAllocationType(v.allocationType) === 'stocks') explicitStock = r2(explicitStock + amt);
    else explicitCash = r2(explicitCash + amt);
  }
  const committedGoalsMonthlyTotal = r2(
    goalSavings
      .filter((g) => g.committed)
      .reduce((s, g) => s + (g.committedMonthlyContribution ?? 0), 0),
  );
  const monthlyCashSavings = r2(explicitCash + committedGoalsMonthlyTotal);
  const monthlyStockSavings = r2(explicitStock);
  const monthlySavings = r2(monthlyCashSavings + monthlyStockSavings);
  return { monthlySavings, monthlyCashSavings, monthlyStockSavings };
}

/**
 * @param {Array<{ amount?: number, allocationType?: string }>} savings
 * @param {Array<{ committed?: boolean, committedMonthlyContribution?: number }>} goalSavings
 */
export function computeMonthlySavingsFromRows(savings, goalSavings) {
  return computeMonthlySavingsSplit(savings, goalSavings).monthlySavings;
}

/**
 * Pure derived snapshot for persistence / cross-tab use (not full provider state).
 */
export function buildBudgetMirrorFromInputs(expenditures, debts, savings, creditCards, goalSavings) {
  const fixed = expenditures.filter((e) => e.section === SECTION_FIXED);
  const nice = expenditures.filter((e) => e.section === SECTION_NICE);
  const fixedP1Total = r2(fixed.reduce((s, e) => s + p1Amount(e), 0));
  const niceP1Total = r2(nice.reduce((s, e) => s + p1Amount(e), 0));

  const debtMonthly = (d) =>
    calculateAmortizingMonthlyPayment(d.principal, d.annualRatePct, d.termMonths);
  const debtMonthlyTotal = r2(debts.reduce((s, d) => s + debtMonthly(d), 0));
  const creditCardMinimumTotal = r2(
    creditCards.reduce((s, c) => s + (c.minimumMonthlyPayment ?? 0), 0),
  );
  const explicitSavingsTotal = r2(savings.reduce((s, v) => s + (v.amount ?? 0), 0));
  const committedGoalsMonthlyTotal = r2(
    goalSavings
      .filter((g) => g.committed)
      .reduce((s, g) => s + (g.committedMonthlyContribution ?? 0), 0),
  );

  const essentialMonthlyCosts = computeEssentialMonthlyCostsFromExpenditures(expenditures);
  const { monthlySavings, monthlyCashSavings, monthlyStockSavings } = computeMonthlySavingsSplit(
    savings,
    goalSavings,
  );
  const plannedMonthlyOutgoings = computePlannedMonthlyOutgoings(
    expenditures,
    debts,
    savings,
    creditCards,
    goalSavings,
  );
  const mortgage = buildMortgageSummaryFromExpenditures(expenditures);

  return {
    version: MIRROR_VERSION,
    generatedAt: new Date().toISOString(),
    essentialMonthlyCosts,
    monthlySavings,
    monthlyCashSavings,
    monthlyStockSavings,
    mortgage,
    breakdown: {
      plannedMonthlyOutgoings,
      householdP1Total: computeHouseholdP1Total(expenditures),
      fixedP1Total,
      niceP1Total,
      debtMonthlyTotal,
      creditCardMinimumTotal,
      explicitSavingsTotal,
      committedGoalsMonthlyTotal,
    },
  };
}

/**
 * Persist canonical mirror (best-effort; ignores quota / private mode errors).
 * @param {ReturnType<typeof buildBudgetMirrorFromInputs>} data
 */
export function writeBudgetMirror(data) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(BUDGET_MIRROR_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/**
 * Clears every Budget `localStorage` key (row mirrors, unexpected buffer, canonical mirror).
 * App shell should use this on sign-out instead of listing key strings.
 */
export function clearBudgetLocalStorageForSignOut() {
  if (typeof localStorage === 'undefined') return;
  for (const k of BUDGET_DEVICE_STORAGE_KEYS) {
    try {
      localStorage.removeItem(k);
    } catch {
      // ignore
    }
  }
}

/** Called from BudgetProvider whenever row mirrors update — keeps cross-tab JSON in sync. */
export function syncBudgetMirrorToStorage(expenditures, debts, savings, creditCards, goalSavings) {
  writeBudgetMirror(buildBudgetMirrorFromInputs(expenditures, debts, savings, creditCards, goalSavings));
}

/**
 * Read canonical mirror from localStorage; on miss or corrupt JSON, migrate from legacy row keys.
 * Never throws.
 */
export function readBudgetMirror() {
  if (typeof localStorage === 'undefined') return defaultBudgetMirror();

  const raw = localStorage.getItem(BUDGET_MIRROR_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return normalizeBudgetMirror(parsed);
    } catch {
      // fall through to legacy migration
    }
  }

  const migrated = migrateBudgetMirrorFromLegacyKeys();
  // Defer persist so callers (e.g. React useMemo) never write during render; next read hits canonical JSON.
  queueMicrotask(() => writeBudgetMirror(migrated));
  return migrated;
}

/**
 * Legacy-only load: reconstruct rows from the same keys BudgetProvider uses, then derive mirror.
 * Used when canonical blob is missing or unreadable.
 */
function migrateBudgetMirrorFromLegacyKeys() {
  const expRows = loadNormalizedExpenditureRowsFromLegacyMirror();
  const debts = loadLegacyDebts();
  const savings = loadLegacySavings();
  const creditCards = loadLegacyCreditCards();
  const goalSavings = loadLegacyGoalSavings();
  return buildBudgetMirrorFromInputs(expRows, debts, savings, creditCards, goalSavings);
}

/**
 * @param {Array<{ amount: number, partner1Pct: number }>} expenditures
 * @param {Array<{ principal: number, annualRatePct: number, termMonths: number }>} debts
 * @param {Array<{ amount?: number }>} savings
 * @param {Array<{ minimumMonthlyPayment?: number }>} creditCards
 * @param {Array<{ committed?: boolean, committedMonthlyContribution?: number }>} goalSavings
 * @returns {number}
 */
export function computePlannedMonthlyOutgoings(
  expenditures,
  debts,
  savings,
  creditCards,
  goalSavings,
) {
  const p1Total = r2(expenditures.reduce((s, e) => s + p1Amount(e), 0));

  const debtMonthly = (d) =>
    calculateAmortizingMonthlyPayment(d.principal, d.annualRatePct, d.termMonths);
  const debtMonthlyTotal = r2(debts.reduce((s, d) => s + debtMonthly(d), 0));

  const explicitSavingsTotal = r2(savings.reduce((s, v) => s + (v.amount ?? 0), 0));
  const committedGoalsMonthlyTotal = r2(
    goalSavings
      .filter((g) => g.committed)
      .reduce((s, g) => s + (g.committedMonthlyContribution ?? 0), 0),
  );
  const savingsTotal = r2(explicitSavingsTotal + committedGoalsMonthlyTotal);

  const creditCardMinimumTotal = r2(
    creditCards.reduce((s, c) => s + (c.minimumMonthlyPayment ?? 0), 0),
  );

  return r2(p1Total + debtMonthlyTotal + savingsTotal + creditCardMinimumTotal);
}

/**
 * Partner-weighted monthly total for household lines in the essential (fixed) section only.
 * Same definition as BudgetProvider `fixedP1Total`.
 *
 * @param {Array<{ amount: number, partner1Pct: number, section: string }>} expenditures — normalized rows
 * @returns {number}
 */
export function computeEssentialMonthlyCostsFromExpenditures(expenditures) {
  const fixed = expenditures.filter((e) => e.section === SECTION_FIXED);
  return r2(fixed.reduce((s, e) => s + p1Amount(e), 0));
}

/**
 * Normalized expenditure rows from legacy localStorage (same parsing as before mirror existed).
 *
 * @returns {Array<{ id: string, name: string, amount: number, partner1Pct: number, section: string }>}
 */
function loadNormalizedExpenditureRowsFromLegacyMirror() {
  let expRows = [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        expRows = parsed.map((r) => normalizeExpenditureRow(r));
        const fixed = expRows.filter((e) => e.section === SECTION_FIXED);
        const nice = expRows.filter((e) => e.section === SECTION_NICE);
        expRows = [...fixed, ...nice];
      }
    }
  } catch {
    // ignore corrupt expenditure mirror
  }
  if (expRows.length === 0) {
    expRows = createDefaultExpenditures();
  }
  return expRows;
}

function loadLegacyDebts() {
  let debts = [];
  try {
    const savedDebts = localStorage.getItem(STORAGE_KEY_DEBTS);
    if (savedDebts) {
      const parsed = JSON.parse(savedDebts);
      if (Array.isArray(parsed)) debts = parsed;
    }
  } catch {
    // leave debts as []
  }
  return debts;
}

function loadLegacySavings() {
  let savings = [];
  try {
    const savedSavings = localStorage.getItem(STORAGE_KEY_SAVINGS);
    if (savedSavings) {
      const parsed = JSON.parse(savedSavings);
      if (Array.isArray(parsed)) savings = parsed.map((r) => normalizeSavingRow(r));
    }
  } catch {
    // leave savings as []
  }
  return savings;
}

function loadLegacyCreditCards() {
  let creditCards = [];
  try {
    const savedCc = localStorage.getItem(STORAGE_KEY_CREDIT_CARDS);
    if (savedCc) {
      const parsed = JSON.parse(savedCc);
      if (Array.isArray(parsed)) creditCards = parsed.map((r) => normalizeCreditCardRow(r));
    }
  } catch {
    // leave creditCards as []
  }
  return creditCards;
}

function loadLegacyGoalSavings() {
  let goalSavings = [];
  try {
    const rawGoals = localStorage.getItem(STORAGE_KEY_GOAL_SAVINGS);
    if (rawGoals) {
      const parsed = JSON.parse(rawGoals);
      if (Array.isArray(parsed)) goalSavings = parsed.map(normalizeGoalSavingRow);
    }
  } catch {
    // leave goalSavings as []
  }
  return goalSavings;
}

/**
 * Essential monthly costs — reads **only** from the canonical mirror (legacy migrated inside `readBudgetMirror` when needed).
 * @returns {number}
 */
export function readEssentialMonthlyCostsFromBudgetMirror() {
  return readBudgetMirror().essentialMonthlyCosts;
}

/**
 * Monthly savings (explicit lines + committed goals) — canonical mirror only.
 * @returns {number}
 */
export function readMonthlySavingsFromBudgetMirror() {
  return readBudgetMirror().monthlySavings;
}

/** @returns {number} */
export function readMonthlyCashSavingsFromBudgetMirror() {
  return readBudgetMirror().monthlyCashSavings;
}

/** @returns {number} */
export function readMonthlyStockSavingsFromBudgetMirror() {
  return readBudgetMirror().monthlyStockSavings;
}

/**
 * Total planned outgoings (same definition as Budget summary) — canonical mirror only.
 * @returns {number}
 */
export function readPlannedMonthlyOutgoingsFromBudgetMirror() {
  return readBudgetMirror().breakdown.plannedMonthlyOutgoings;
}

/**
 * Dedicated selector: normalized mortgage summary from the canonical Budget mirror
 * (`housing_mortgage` expenditure rows; totals from valid rows only). Same object as `readBudgetMirror().mortgage`.
 *
 * @returns {ReturnType<typeof normalizeMortgageMirrorSlice>}
 */
export function readMortgageSummaryFromBudgetMirror() {
  return readBudgetMirror().mortgage;
}

/** Alias for consumers that prefer "selector" naming — identical to {@link readMortgageSummaryFromBudgetMirror}. */
export const selectMortgageSummaryFromBudgetMirror = readMortgageSummaryFromBudgetMirror;
