/**
 * Forward-looking projection — pure functions only.
 * Monthly compounding: each month adds contributions (start-of-month), then applies growth.
 * Annual % inputs are converted to equivalent monthly multipliers: (1 + r_annual)^(1/12).
 * Balances use full precision during the loop; round2 applies only when building row snapshots.
 *
 * Liabilities: Net Worth `totalLiabilities` = mortgageBalance + loans + creditCards.
 * When Budget has `housing_mortgage` rows, that mortgage principal is amortized separately;
 * the NW mortgage figure is split so we do not double-count: static part = loans + CC +
 * max(0, mortgageNW − sum(Budget mortgage balances)).
 */

import { calculateMortgageAmortizationStep } from './debt';

const round2 = (n) => Math.round((n ?? 0) * 100) / 100;

const safeMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

/**
 * @typedef {object} ProjectionInputs
 * @property {number} projectionYears
 * @property {number} pensionGrowthAnnualPct
 * @property {number} investmentGrowthAnnualPct
 * @property {number} cashGrowthAnnualPct
 * @property {number} contributionEscalationAnnualPct
 * @property {number} inflationAnnualPct
 */

/**
 * @typedef {object} LiabilityBreakdown
 * @property {number} mortgageBalance
 * @property {number} loans
 * @property {number} creditCards
 */

/**
 * @typedef {object} MortgageMirrorRow
 * @property {number} currentBalance
 * @property {number} annualInterestRate
 * @property {number} remainingTermMonths
 * @property {number} monthlyPayment
 */

/**
 * @typedef {object} MortgageFromBudget
 * @property {boolean} enabled
 * @property {MortgageMirrorRow[]} rows
 * @property {number} totalBalance
 * @property {number} totalMonthlyPayment
 */

/**
 * @typedef {object} ProjectionSnapshot
 * @property {number} pensionHoldings
 * @property {number} stocksAndShares
 * @property {number} cash
 * @property {number} propertyValue
 * @property {number} totalLiabilities — full NW total (includes mortgage); also see liabilityBreakdown
 * @property {LiabilityBreakdown} [liabilityBreakdown]
 * @property {MortgageFromBudget} [mortgageFromBudget]
 * @property {number} annualPensionContribution — from {@link calculateFullPosition} `totalGrossAnnual`
 * @property {number} monthlyBudgetSavings — total explicit + committed goal savings (compatibility)
 * @property {number} monthlyCashSavings — Budget mirror: cash-allocated monthly amount (+ goals as cash)
 * @property {number} monthlyStockSavings — Budget mirror: stocks-allocated monthly amount
 */

/**
 * Cumulative user contributions (pension + budget savings to stocks/cash). Property has none in-model.
 * @typedef {object} CumulativeContributionsBreakdown
 * @property {number} pension
 * @property {number} stocks
 * @property {number} cash
 * @property {number} total
 */

/**
 * One asset class at a given projection row (year). `contributions` and `growth` are cumulative from baseline through that row’s year — not the incremental amount for that year alone.
 * @typedef {object} AssetClassAttribution
 * @property {number} starting — baseline at year 0
 * @property {number} contributions — cumulative contributions through this row
 * @property {number} growth — cumulative residual (balance − starting − contributions) through this row
 * @property {number} ending — row balance (matches table column)
 */

/**
 * Per-asset breakdown (pension, stocks, cash, property).
 * @typedef {object} ByAssetAttribution
 * @property {AssetClassAttribution} pension
 * @property {AssetClassAttribution} stocks
 * @property {AssetClassAttribution} cash
 * @property {AssetClassAttribution} property
 */

/**
 * Asset-side attribution only (excludes liabilities). Totals reconcile to `totalAssets`; per-asset rows reconcile independently.
 * @typedef {object} AssetAttribution
 * @property {number} startingAssetsTotal — baseline total assets (same formula as first-year `totalAssets`)
 * @property {CumulativeContributionsBreakdown} cumulativeContributions — to date at this row
 * @property {number} cumulativeGrowth — sum of per-asset `growth` (may differ by ≤1p from `totalAssets − startingAssetsTotal − cumulativeContributions.total` due to `totalAssets` rounding)
 * @property {ByAssetAttribution} byAsset — pension / stocks / cash / property
 */

/**
 * @typedef {object} ProjectionYearRow
 * @property {number} yearIndex — 0 = baseline, 1 = after one full year of monthly steps, …
 * @property {number} pension
 * @property {number} stocksAndShares
 * @property {number} cash
 * @property {number} propertyValue
 * @property {number} totalLiabilities
 * @property {number} totalAssets
 * @property {number} netWorth
 * @property {AssetAttribution} assetAttribution
 */

/** @param {number} pctWhole e.g. 5 for 5% — returns 1 + p/100 */
function pctToAnnualFactor(pctWhole) {
  const p = Number(pctWhole);
  if (!Number.isFinite(p)) return 1;
  return 1 + p / 100;
}

/**
 * Equivalent monthly compound multiplier from nominal annual % (same effective rate after 12 months).
 * @param {number} pctWhole annual % as stored in inputs
 */
function annualPctToMonthlyMultiplier(pctWhole) {
  return Math.pow(pctToAnnualFactor(pctWhole), 1 / 12);
}

/**
 * @param {ProjectionInputs} inputs
 * @param {ProjectionSnapshot} snap
 * @returns {{
 *   rows: ProjectionYearRow[],
 *   finalRow: ProjectionYearRow,
 *   attributionSummary: AssetAttribution
 * }}
 */
export function computeProjectionSeries(inputs, snap) {
  const years = Math.min(40, Math.max(1, Math.round(Number(inputs.projectionYears) || 1)));
  const totalMonths = years * 12;

  const gP = annualPctToMonthlyMultiplier(inputs.pensionGrowthAnnualPct);
  const gI = annualPctToMonthlyMultiplier(inputs.investmentGrowthAnnualPct);
  const gC = annualPctToMonthlyMultiplier(inputs.cashGrowthAnnualPct);
  const gProp = annualPctToMonthlyMultiplier(inputs.inflationAnnualPct);
  const esc = pctToAnnualFactor(inputs.contributionEscalationAnnualPct);

  let pension = Math.max(0, Number(snap.pensionHoldings) || 0);
  let stocks = Math.max(0, Number(snap.stocksAndShares) || 0);
  let cash = Math.max(0, Number(snap.cash) || 0);
  let propertyValue = Math.max(0, Number(snap.propertyValue) || 0);

  const legacyStaticTotal = Math.max(0, Number(snap.totalLiabilities) || 0);
  const lb = snap.liabilityBreakdown;
  const mfb = snap.mortgageFromBudget;
  const mortgageRows =
    mfb?.enabled && Array.isArray(mfb.rows) && mfb.rows.length > 0 ? mfb.rows : [];

  /** Need NW split + Budget mortgage rows; else single static liabilities number (pre-mortgage feature). */
  const useMortgageAmortization = Boolean(lb) && mortgageRows.length > 0;

  let staticLiabilities;
  /** @type {number[]} */
  let mortgageBalances = [];
  /** @type {number[]} */
  let mortgagePayments = [];
  /** @type {number[]} */
  let mortgageRates = [];

  if (useMortgageAmortization) {
    const mNW = safeMoney(lb.mortgageBalance);
    const loans = safeMoney(lb.loans);
    const creditCards = safeMoney(lb.creditCards);
    const sumBudgetMortgage = mortgageRows.reduce((s, r) => s + safeMoney(r.currentBalance), 0);
    const staticMortgageRemainder = Math.max(0, mNW - sumBudgetMortgage);
    staticLiabilities = round2(loans + creditCards + staticMortgageRemainder);
    mortgageBalances = mortgageRows.map((r) => safeMoney(r.currentBalance));
    mortgagePayments = mortgageRows.map((r) => safeMoney(r.monthlyPayment));
    mortgageRates = mortgageRows.map((r) => Number(r.annualInterestRate) || 0);
  } else {
    staticLiabilities = legacyStaticTotal;
  }

  const annualPensionContrib = Math.max(0, Number(snap.annualPensionContribution) || 0);

  const hasSavingsSplit =
    snap.monthlyCashSavings != null || snap.monthlyStockSavings != null;
  const monthlyCashSavings = Math.max(0, Number(snap.monthlyCashSavings) || 0);
  let monthlyStockSavings = Math.max(0, Number(snap.monthlyStockSavings) || 0);
  let cashSavings = monthlyCashSavings;
  if (!hasSavingsSplit) {
    const legacyTotal = Math.max(0, Number(snap.monthlyBudgetSavings) || 0);
    cashSavings = legacyTotal;
    monthlyStockSavings = 0;
  }

  const startingPension = pension;
  const startingStocks = stocks;
  const startingCash = cash;
  const startingProperty = propertyValue;
  const startingAssetsTotal = round2(
    round2(startingPension) + round2(startingStocks) + round2(startingCash) + round2(startingProperty),
  );

  let cumPensionContrib = 0;
  let cumStockContrib = 0;
  let cumCashContrib = 0;

  /** @type {ProjectionYearRow[]} */
  const rows = [];

  const totalLiabilitiesNow = () => {
    const mortSum = mortgageBalances.reduce((s, b) => s + b, 0);
    return round2(staticLiabilities + mortSum);
  };

  const startP = round2(startingPension);
  const startS = round2(startingStocks);
  const startC = round2(startingCash);
  const startProp = round2(startingProperty);

  /** Round only when emitting rows — balances compound at full precision inside the monthly loop. */
  const pushRow = (yearIndex) => {
    const p = round2(pension);
    const s = round2(stocks);
    const c = round2(cash);
    const pv = round2(propertyValue);
    const liab = round2(totalLiabilitiesNow());
    const totalAssets = round2(p + s + c + pv);
    const netWorth = round2(totalAssets - liab);
    const cp = round2(cumPensionContrib);
    const cs = round2(cumStockContrib);
    const cc = round2(cumCashContrib);
    const cumContribTotal = round2(cp + cs + cc);

    const gP = round2(p - startP - cp);
    const gS = round2(s - startS - cs);
    const gC = round2(c - startC - cc);
    const gProp = round2(pv - startProp);

    /** Sum of per-asset residuals; may differ by ≤1p from `totalAssets − startingAssetsTotal − cumContribTotal` due to rounding `totalAssets`. */
    const cumulativeGrowth = round2(gP + gS + gC + gProp);

    /** @type {ByAssetAttribution} */
    const byAsset = {
      pension: { starting: startP, contributions: cp, growth: gP, ending: p },
      stocks: { starting: startS, contributions: cs, growth: gS, ending: s },
      cash: { starting: startC, contributions: cc, growth: gC, ending: c },
      property: { starting: startProp, contributions: 0, growth: gProp, ending: pv },
    };

    /** @type {AssetAttribution} */
    const assetAttribution = {
      startingAssetsTotal,
      cumulativeContributions: {
        pension: cp,
        stocks: cs,
        cash: cc,
        total: cumContribTotal,
      },
      cumulativeGrowth,
      byAsset,
    };
    rows.push({
      yearIndex,
      pension: p,
      stocksAndShares: s,
      cash: c,
      propertyValue: pv,
      totalLiabilities: liab,
      totalAssets,
      netWorth,
      assetAttribution,
    });
  };

  pushRow(0);

  for (let m = 0; m < totalMonths; m++) {
    const yearFloor = Math.floor(m / 12);
    const escFactor = esc ** yearFloor;
    const contribMult = Number.isFinite(escFactor) ? escFactor : 0;

    const pensionContribMonth = (annualPensionContrib * contribMult) / 12;
    const cashContrib = cashSavings * contribMult;
    const stockContrib = monthlyStockSavings * contribMult;

    cumPensionContrib += pensionContribMonth;
    cumStockContrib += stockContrib;
    cumCashContrib += cashContrib;

    const pNext = (pension + pensionContribMonth) * gP;
    const sNext = (stocks + stockContrib) * gI;
    const cNext = (cash + cashContrib) * gC;
    const propNext = propertyValue * gProp;

    pension = Number.isFinite(pNext) ? Math.max(0, pNext) : 0;
    stocks = Number.isFinite(sNext) ? Math.max(0, sNext) : 0;
    cash = Number.isFinite(cNext) ? Math.max(0, cNext) : 0;
    propertyValue = Number.isFinite(propNext) ? Math.max(0, propNext) : 0;

    if (useMortgageAmortization && mortgageBalances.length > 0) {
      for (let i = 0; i < mortgageBalances.length; i++) {
        const step = calculateMortgageAmortizationStep(
          mortgageBalances[i],
          mortgageRates[i],
          mortgagePayments[i],
        );
        mortgageBalances[i] = step.nextBalance;
      }
    }

    if ((m + 1) % 12 === 0) {
      pushRow((m + 1) / 12);
    }
  }

  const last = rows[rows.length - 1];
  const finalRow = last ?? rows[0];
  return {
    rows,
    finalRow,
    attributionSummary: finalRow.assetAttribution,
  };
}
