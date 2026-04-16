/**
 * Mortgage-specific expenditure rows (category `housing_mortgage`).
 * Payment is derived from balance, APR, and term — not manually edited.
 */
import { calculateAmortizingMonthlyPayment } from '../../../utils/debt';

const r2 = (n) => Math.round((n ?? 0) * 100) / 100;

/** Keep literal to avoid circular import with `expenditures.js`. */
export const HOUSING_MORTGAGE_CATEGORY = 'housing_mortgage';

/**
 * @typedef {object} NormalizedMortgageMetadata
 * @property {number} currentBalance
 * @property {number} annualInterestRate
 * @property {number} remainingTermMonths
 */

/**
 * @param {unknown} raw
 * @returns {NormalizedMortgageMetadata}
 */
export function normalizeMortgageMetadata(raw) {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const currentBalance = Math.max(0, r2(Number(o.currentBalance ?? o.current_balance ?? 0)));
  const ar = Number(o.annualInterestRate ?? o.annual_interest_rate);
  const annualInterestRate = Number.isFinite(ar) ? ar : 0;
  const rm = Math.round(Number(o.remainingTermMonths ?? o.remaining_term_months ?? 0));
  const remainingTermMonths = Number.isFinite(rm) && rm > 0 ? rm : 0;
  return { currentBalance, annualInterestRate, remainingTermMonths };
}

/** Same formula as loan repayment; zero APR → P/n. */
export function calculateMonthlyMortgagePayment(currentBalance, annualInterestRatePct, remainingTermMonths) {
  return calculateAmortizingMonthlyPayment(currentBalance, annualInterestRatePct, remainingTermMonths);
}

/**
 * Effective household monthly amount for Budget totals (full payment before partner %).
 * @param {{ category?: string, amount?: number, metadata?: Record<string, unknown> }} row
 */
export function getEffectiveExpenditureAmount(row) {
  if (!row || row.category !== HOUSING_MORTGAGE_CATEGORY) {
    return r2(Number(row?.amount) || 0);
  }
  const m = normalizeMortgageMetadata(row.metadata);
  return calculateMonthlyMortgagePayment(m.currentBalance, m.annualInterestRate, m.remainingTermMonths);
}

/**
 * Coerce a persisted mortgage mirror slice (possibly partial / legacy) into a stable shape.
 * Invalid rows are dropped; totals and `enabled` are derived from valid rows only.
 *
 * @param {unknown} raw — from `mirror.mortgage` or equivalent
 * @returns {{
 *   enabled: boolean,
 *   rows: Array<{
 *     id: string,
 *     currentBalance: number,
 *     annualInterestRate: number,
 *     remainingTermMonths: number,
 *     monthlyPayment: number,
 *   }>,
 *   totalBalance: number,
 *   totalMonthlyPayment: number,
 * }}
 */
export function normalizeMortgageMirrorSlice(raw) {
  const empty = {
    enabled: false,
    rows: [],
    totalBalance: 0,
    totalMonthlyPayment: 0,
  };
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return empty;

  const o = /** @type {Record<string, unknown>} */ (raw);
  const rowsIn = Array.isArray(o.rows) ? o.rows : [];
  const rows = [];
  let idx = 0;
  for (const item of rowsIn) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const r = /** @type {Record<string, unknown>} */ (item);
    const nested =
      r.metadata && typeof r.metadata === 'object' && !Array.isArray(r.metadata)
        ? /** @type {Record<string, unknown>} */ (r.metadata)
        : {};
    const { id: _rowId, metadata: _meta, ...rest } = r;
    const m = normalizeMortgageMetadata({ ...nested, ...rest });
    if (m.currentBalance <= 0 || m.remainingTermMonths <= 0) continue;
    const monthlyPayment = calculateMonthlyMortgagePayment(
      m.currentBalance,
      m.annualInterestRate,
      m.remainingTermMonths,
    );
    const idStr = typeof r.id === 'string' && r.id.trim() ? r.id.trim() : `mortgage-${idx}`;
    rows.push({
      id: idStr,
      currentBalance: m.currentBalance,
      annualInterestRate: m.annualInterestRate,
      remainingTermMonths: m.remainingTermMonths,
      monthlyPayment,
    });
    idx += 1;
  }
  const enabled = rows.length > 0;
  const totalBalance = r2(rows.reduce((s, x) => s + x.currentBalance, 0));
  const totalMonthlyPayment = r2(rows.reduce((s, x) => s + x.monthlyPayment, 0));
  return {
    enabled,
    rows,
    totalBalance,
    totalMonthlyPayment,
  };
}

/**
 * One row in the Budget mirror mortgage summary (all `housing_mortgage` lines; multiple properties supported).
 * @param {Array<{ id?: string, category?: string, metadata?: Record<string, unknown> }>} expenditures
 */
export function buildMortgageSummaryFromExpenditures(expenditures) {
  const list = Array.isArray(expenditures) ? expenditures : [];
  const rows = [];
  for (const e of list) {
    if (e?.category !== HOUSING_MORTGAGE_CATEGORY) continue;
    const m = normalizeMortgageMetadata(e.metadata);
    if (m.currentBalance <= 0 || m.remainingTermMonths <= 0) continue;
    const monthlyPayment = calculateMonthlyMortgagePayment(
      m.currentBalance,
      m.annualInterestRate,
      m.remainingTermMonths,
    );
    const idStr = typeof e.id === 'string' && e.id.trim() ? e.id.trim() : '';
    rows.push({
      id: idStr || `mortgage-${rows.length}`,
      currentBalance: m.currentBalance,
      annualInterestRate: m.annualInterestRate,
      remainingTermMonths: m.remainingTermMonths,
      monthlyPayment,
    });
  }
  const enabled = rows.length > 0;
  const totalBalance = r2(rows.reduce((s, x) => s + x.currentBalance, 0));
  const totalMonthlyPayment = r2(rows.reduce((s, x) => s + x.monthlyPayment, 0));
  return {
    enabled,
    rows,
    totalBalance,
    totalMonthlyPayment,
  };
}
