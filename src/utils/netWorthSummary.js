/**
 * Net worth module — pure helpers only.
 *
 * **Layers** (see also `netWorthStorage.js` for persistence):
 * - **Canonical inputs** — `assets` and manual liabilities (`loans`, `creditCards`); mortgage is not persisted on Net Worth state.
 * - **Derived mortgage** — passed into `computeNetWorthSummary` / `computeNetWorthInsights` from Budget mirror (App), not from liability state.
 * - **Derived summary** — `computeNetWorthSummary` (totals, derived property equity).
 * - **Derived insights** — `computeNetWorthInsights` (ratios, emergency fund, etc.).
 * - **UI-only / presentational** — completeness, edge flags, basis subline strings (no effect on maths).
 */
import { formatCurrency } from './calculations';
import { NET_WORTH_CANONICAL_ASSET_KEYS, NET_WORTH_MANUAL_LIABILITY_KEYS } from './netWorthStorage';
import { sanitizeMoney } from './netWorthMoney';

/** @param {unknown} v @returns {number} */
export const safeMoney = sanitizeMoney;

export { parsePoundsInput } from './netWorthMoney';

/**
 * @param {unknown} v
 * @returns {boolean} True when the value sanitises to a finite non-negative amount (including explicit zero).
 */
function isCanonicalFieldFilled(v) {
  const m = safeMoney(v);
  return Number.isFinite(m) && m >= 0;
}

/**
 * Counts canonical fields with a valid non-negative amount. Explicit `0` counts as filled (not “missing”).
 * Used for a descriptive completeness line only; does not affect totals or ratios.
 *
 * @param {{ assets?: Record<string, unknown>, liabilities?: Record<string, unknown> } | null | undefined} netWorthInputs
 * @returns {{ completedCount: number, totalCount: number }}
 */
export function computeNetWorthCompleteness(netWorthInputs) {
  const assets =
    netWorthInputs?.assets && typeof netWorthInputs.assets === 'object' && !Array.isArray(netWorthInputs.assets)
      ? netWorthInputs.assets
      : {};
  const liabilities =
    netWorthInputs?.liabilities &&
    typeof netWorthInputs.liabilities === 'object' &&
    !Array.isArray(netWorthInputs.liabilities)
      ? netWorthInputs.liabilities
      : {};
  let completedCount = 0;
  for (const k of NET_WORTH_CANONICAL_ASSET_KEYS) {
    if (isCanonicalFieldFilled(assets[k])) completedCount += 1;
  }
  for (const k of NET_WORTH_MANUAL_LIABILITY_KEYS) {
    if (isCanonicalFieldFilled(liabilities[k])) completedCount += 1;
  }
  const totalCount = NET_WORTH_CANONICAL_ASSET_KEYS.length + NET_WORTH_MANUAL_LIABILITY_KEYS.length;
  return { completedCount, totalCount };
}

/**
 * True if any canonical field is strictly positive (for “no values entered” edge copy).
 *
 * @param {{ assets?: Record<string, unknown>, liabilities?: Record<string, unknown> } | null | undefined} netWorthInputs
 */
function hasAnyNonZeroCanonicalInput(netWorthInputs) {
  const assets =
    netWorthInputs?.assets && typeof netWorthInputs.assets === 'object' && !Array.isArray(netWorthInputs.assets)
      ? netWorthInputs.assets
      : {};
  const liabilities =
    netWorthInputs?.liabilities &&
    typeof netWorthInputs.liabilities === 'object' &&
    !Array.isArray(netWorthInputs.liabilities)
      ? netWorthInputs.liabilities
      : {};
  for (const k of NET_WORTH_CANONICAL_ASSET_KEYS) {
    if (safeMoney(assets[k]) > 0) return true;
  }
  for (const k of NET_WORTH_MANUAL_LIABILITY_KEYS) {
    if (safeMoney(liabilities[k]) > 0) return true;
  }
  return false;
}

/**
 * Single pass for Net Worth tab presentational flags (completeness + edge messaging).
 * Does not affect totals or ratios. Pass `totalAssets` from {@link computeNetWorthSummary}.
 *
 * @param {{ assets?: Record<string, unknown>, liabilities?: Record<string, unknown> } | null | undefined} netWorthInputs
 * @param {number} totalAssets
 * @returns {{
 *   completedCount: number,
 *   totalCount: number,
 *   allInputsZero: boolean,
 *   totalAssetsZero: boolean,
 * }}
 */
export function computeNetWorthPresentationalState(netWorthInputs, totalAssets) {
  const { completedCount, totalCount } = computeNetWorthCompleteness(netWorthInputs);
  const ta = safeMoney(totalAssets);
  return {
    completedCount,
    totalCount,
    allInputsZero: !hasAnyNonZeroCanonicalInput(netWorthInputs),
    totalAssetsZero: ta === 0,
  };
}

/**
 * Property equity from gross value and Budget-derived mortgage balance (not stored).
 * @param {Record<string, unknown>} assets
 * @param {unknown} derivedMortgageBalance — from Budget mirror total; non-finite → 0
 * @returns {number}
 */
export function getDerivedPropertyEquity(assets, derivedMortgageBalance) {
  const pv = safeMoney(assets?.propertyValue);
  const mortgage = safeMoney(derivedMortgageBalance);
  return Math.max(0, pv - mortgage);
}

/**
 * Read-only currency display for derived property equity (matches {@link computeNetWorthSummary}).
 *
 * @param {number} derivedPropertyEquity
 * @returns {string}
 */
export function formatDerivedPropertyEquityDisplay(derivedPropertyEquity) {
  return formatCurrency(safeMoney(derivedPropertyEquity));
}

/**
 * Total assets: property value + cash + stocks + pension.
 * Total liabilities = **derived mortgage (Budget)** + manual loans + manual credit cards.
 * Any `liabilities.mortgageBalance` on persisted state is ignored here (legacy only).
 *
 * @param {Record<string, unknown>} assets
 * @param {Record<string, unknown>} manualLiabilities — expects `loans`, `creditCards`; `mortgageBalance` ignored
 * @param {unknown} derivedMortgageBalance — Budget mirror total mortgage; non-finite → 0
 * @returns {{ totalAssets: number, totalLiabilities: number, netWorth: number, derivedPropertyEquity: number }}
 */
export function computeNetWorthSummary(assets, manualLiabilities, derivedMortgageBalance) {
  const propertyValue = safeMoney(assets?.propertyValue);
  const cash = safeMoney(assets?.cash);
  const stocks = safeMoney(assets?.stocksAndShares);
  const pension = safeMoney(assets?.pensionHoldings);
  const totalAssets = propertyValue + cash + stocks + pension;

  const mortgage = safeMoney(derivedMortgageBalance);
  const loanTotal = safeMoney(manualLiabilities?.loans);
  const creditCards = safeMoney(manualLiabilities?.creditCards);
  const totalLiabilities = mortgage + loanTotal + creditCards;

  const netWorth = totalAssets - totalLiabilities;
  const derivedPropertyEquity = getDerivedPropertyEquity(assets, derivedMortgageBalance);

  return { totalAssets, totalLiabilities, netWorth, derivedPropertyEquity };
}

/**
 * Part ÷ total; safe when total is non-positive or values are non-finite (returns 0).
 * Does not clamp the result above 1; debt can exceed 100% of assets when liabilities exceed assets.
 *
 * @param {number} part
 * @param {number} total
 * @returns {number}
 */
export function safeRatioOf(part, total) {
  const t = Number(total);
  const p = Number(part);
  if (!Number.isFinite(t) || t <= 0) return 0;
  if (!Number.isFinite(p)) return 0;
  return p / t;
}

/**
 * Formats a unit ratio (e.g. 0.42) as a whole-number percentage string (e.g. "42%").
 * Non-finite or negative ratios render as "0%".
 *
 * @param {number} ratio
 * @returns {string}
 */
export function formatNetWorthRatioAsPercent(ratio) {
  const r = Number(ratio);
  if (!Number.isFinite(r)) return '0%';
  const pct = Math.round(r * 100);
  return `${Math.max(0, pct)}%`;
}

/**
 * Liquid assets ÷ monthly outgoings. Returns 0 if monthly outgoings ≤ 0 or if the result is non-finite.
 *
 * @param {number} liquidAssets
 * @param {number} monthlyOutgoings
 * @returns {number}
 */
export function safeEmergencyFundMonths(liquidAssets, monthlyOutgoings) {
  const l = safeMoney(liquidAssets);
  const m = safeMoney(monthlyOutgoings);
  if (m <= 0) return 0;
  const q = l / m;
  return Number.isFinite(q) ? q : 0;
}

/**
 * One decimal place, e.g. "2.5", "8.0". Non-finite or negative input → "0.0".
 *
 * @param {number} months
 * @returns {string}
 */
export function formatEmergencyFundMonths(months) {
  const n = Number(months);
  if (!Number.isFinite(n) || n < 0) return '0.0';
  const rounded = Math.round(n * 10) / 10;
  if (!Number.isFinite(rounded)) return '0.0';
  return rounded.toFixed(1);
}

/**
 * Factual one-line basis for Emergency Fund Months: cash balances ÷ essential monthly costs.
 * Same numerator as {@link safeEmergencyFundMonths}. Non-finite inputs format as £0.
 *
 * @param {number} liquidAssets
 * @param {number} essentialMonthlyCosts
 * @returns {string}
 */
export function formatEmergencyFundMonthsBasisSubline(liquidAssets, essentialMonthlyCosts) {
  const liquid = safeMoney(liquidAssets);
  const essential = safeMoney(essentialMonthlyCosts);
  return `Based on ${formatCurrency(liquid)} cash balances ÷ ${formatCurrency(essential)} essential monthly costs`;
}

/**
 * Basis for Liquidity Ratio ({@link safeRatioOf}(liquidAssets, totalAssets)); liquid assets are cash only.
 *
 * @param {number} liquidAssets
 * @param {number} totalAssets
 * @returns {string}
 */
export function formatLiquidityRatioBasisSubline(liquidAssets, totalAssets) {
  const liquid = safeMoney(liquidAssets);
  const total = safeMoney(totalAssets);
  return `Based on ${formatCurrency(liquid)} cash balances ÷ ${formatCurrency(total)} total assets`;
}

/**
 * Basis for Debt Ratio ({@link safeRatioOf}(totalLiabilities, totalAssets)).
 *
 * @param {number} totalLiabilities
 * @param {number} totalAssets
 * @returns {string}
 */
export function formatDebtRatioBasisSubline(totalLiabilities, totalAssets) {
  const liab = safeMoney(totalLiabilities);
  const total = safeMoney(totalAssets);
  return `Based on ${formatCurrency(liab)} total liabilities ÷ ${formatCurrency(total)} total assets`;
}

/**
 * Basis for Pension Share of Total Assets ({@link safeRatioOf}(pensionHoldings, totalAssets)).
 *
 * @param {number} pensionHoldings
 * @param {number} totalAssets
 * @returns {string}
 */
export function formatPensionShareBasisSubline(pensionHoldings, totalAssets) {
  const p = safeMoney(pensionHoldings);
  const total = safeMoney(totalAssets);
  return `Based on ${formatCurrency(p)} pension holdings ÷ ${formatCurrency(total)} total assets`;
}

/**
 * Basis for Property Share of Total Assets ({@link safeRatioOf}(gross property value, totalAssets)).
 *
 * @param {number} propertyValueGross
 * @param {number} totalAssets
 * @returns {string}
 */
export function formatPropertyShareBasisSubline(propertyValueGross, totalAssets) {
  const pv = safeMoney(propertyValueGross);
  const total = safeMoney(totalAssets);
  return `Based on ${formatCurrency(pv)} property value ÷ ${formatCurrency(total)} total assets`;
}

/**
 * Basis for Cash Share of Total Assets ({@link safeRatioOf}(cash, totalAssets)).
 *
 * @param {number} cash
 * @param {number} totalAssets
 * @returns {string}
 */
export function formatCashShareBasisSubline(cash, totalAssets) {
  const c = safeMoney(cash);
  const total = safeMoney(totalAssets);
  return `Based on ${formatCurrency(c)} cash ÷ ${formatCurrency(total)} total assets`;
}

/**
 * Basis for Stocks and Shares Share of Total Assets ({@link safeRatioOf}(stocksAndShares, totalAssets)).
 *
 * @param {number} stocksAndShares
 * @param {number} totalAssets
 * @returns {string}
 */
export function formatStocksAndSharesShareBasisSubline(stocksAndShares, totalAssets) {
  const s = safeMoney(stocksAndShares);
  const total = safeMoney(totalAssets);
  return `Based on ${formatCurrency(s)} stocks and shares ÷ ${formatCurrency(total)} total assets`;
}

/**
 * Descriptive metrics — liquid assets are cash balances only (stocks and shares are excluded).
 * Delegates liability and net worth figures to {@link computeNetWorthSummary}.
 *
 * Ratios use the same {@link computeNetWorthSummary} totals: liquidity = liquidAssets ÷ totalAssets,
 * debt = totalLiabilities ÷ totalAssets; concentration uses cash, stocks, pensionHoldings, or gross property value ÷ totalAssets.
 * Any ratio is 0 when totalAssets ≤ 0. Property share uses gross property value (same basis as total assets), not derived equity.
 *
 * @param {Record<string, unknown>} assets
 * @param {Record<string, unknown>} manualLiabilities — `loans`, `creditCards` only; stored `mortgageBalance` ignored
 * @param {{ essentialMonthlyCosts?: number, derivedMortgageBalance?: number }} [options] — `derivedMortgageBalance` from Budget mirror (App); `essentialMonthlyCosts` from Budget mirror
 * @returns {{
 *   liquidAssets: number,
 *   totalLiabilities: number,
 *   netWorth: number,
 *   derivedPropertyEquity: number,
 *   totalAssets: number,
 *   liquidityRatio: number,
 *   debtRatio: number,
 *   pensionShareOfAssets: number,
 *   propertyShareOfAssets: number,
 *   cashShareOfAssets: number,
 *   stocksAndSharesShareOfAssets: number,
 *   emergencyFundMonths: number,
 *   essentialMonthlyCosts: number,
 *   pensionHoldings: number,
 *   cash: number,
 *   stocksAndShares: number,
 * }}
 */
export function computeNetWorthInsights(assets, manualLiabilities, options = {}) {
  const cash = safeMoney(assets?.cash);
  const stocks = safeMoney(assets?.stocksAndShares);
  const pensionHoldings = safeMoney(assets?.pensionHoldings);
  const propertyValueGross = safeMoney(assets?.propertyValue);
  const liquidAssets = cash;
  const derivedMortgageBalance = safeMoney(options.derivedMortgageBalance);
  const { totalAssets, totalLiabilities, netWorth, derivedPropertyEquity } = computeNetWorthSummary(
    assets,
    manualLiabilities,
    derivedMortgageBalance,
  );
  const liquidityRatio = safeRatioOf(liquidAssets, totalAssets);
  const debtRatio = safeRatioOf(totalLiabilities, totalAssets);
  const pensionShareOfAssets = safeRatioOf(pensionHoldings, totalAssets);
  const propertyShareOfAssets = safeRatioOf(propertyValueGross, totalAssets);
  const cashShareOfAssets = safeRatioOf(cash, totalAssets);
  const stocksAndSharesShareOfAssets = safeRatioOf(stocks, totalAssets);
  const essentialMonthlyCosts = safeMoney(options.essentialMonthlyCosts);
  const emergencyFundMonths = safeEmergencyFundMonths(liquidAssets, essentialMonthlyCosts);
  return {
    liquidAssets,
    totalLiabilities,
    netWorth,
    derivedPropertyEquity,
    totalAssets,
    liquidityRatio,
    debtRatio,
    pensionShareOfAssets,
    propertyShareOfAssets,
    cashShareOfAssets,
    stocksAndSharesShareOfAssets,
    emergencyFundMonths,
    essentialMonthlyCosts,
    pensionHoldings,
    cash,
    stocksAndShares: stocks,
  };
}
