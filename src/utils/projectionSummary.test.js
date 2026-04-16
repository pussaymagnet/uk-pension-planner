import { describe, it, expect } from 'vitest';
import { computeProjectionSeries } from './projectionSummary.js';

/** @returns {import('./projectionSummary.js').ProjectionSnapshot} */
function baseSnapshot(overrides = {}) {
  return {
    pensionHoldings: 10_000,
    stocksAndShares: 5_000,
    cash: 2_000,
    propertyValue: 100_000,
    totalLiabilities: 0,
    annualPensionContribution: 0,
    monthlyBudgetSavings: 0,
    monthlyCashSavings: 0,
    monthlyStockSavings: 0,
    ...overrides,
  };
}

/** @returns {import('./projectionSummary.js').ProjectionInputs} */
function baseInputs(overrides = {}) {
  return {
    projectionYears: 5,
    pensionGrowthAnnualPct: 5,
    investmentGrowthAnnualPct: 5,
    cashGrowthAnnualPct: 1,
    contributionEscalationAnnualPct: 2,
    inflationAnnualPct: 2,
    ...overrides,
  };
}

function assertAttributionIdentity(row) {
  const a = row.assetAttribution;
  expect(a).toBeDefined();
  const total =
    a.startingAssetsTotal + a.cumulativeContributions.total + a.cumulativeGrowth;
  expect(row.totalAssets).toBeCloseTo(total, 10);
}

function assertPerAssetReconciles(a) {
  expect(a.byAsset).toBeDefined();
  const { pension, stocks, cash, property } = a.byAsset;
  for (const x of [pension, stocks, cash, property]) {
    expect(x.ending).toBeCloseTo(x.starting + x.contributions + x.growth, 10);
  }
  const sumContrib =
    pension.contributions + stocks.contributions + cash.contributions + property.contributions;
  expect(a.cumulativeContributions.total).toBeCloseTo(sumContrib, 10);
  const sumGrowth =
    pension.growth + stocks.growth + cash.growth + property.growth;
  expect(a.cumulativeGrowth).toBeCloseTo(sumGrowth, 10);
}

describe('computeProjectionSeries — asset attribution', () => {
  it('zero growth rates: cumulative growth is zero and ending assets equal starting plus contributions', () => {
    const snap = baseSnapshot({
      annualPensionContribution: 12_000,
      monthlyCashSavings: 100,
      monthlyStockSavings: 50,
    });
    const inputs = baseInputs({
      projectionYears: 3,
      pensionGrowthAnnualPct: 0,
      investmentGrowthAnnualPct: 0,
      cashGrowthAnnualPct: 0,
      contributionEscalationAnnualPct: 0,
      inflationAnnualPct: 0,
    });
    const { rows, finalRow, attributionSummary } = computeProjectionSeries(inputs, snap);

    expect(attributionSummary).toBe(finalRow.assetAttribution);
    expect(attributionSummary.cumulativeGrowth).toBe(0);

    const months = 3 * 12;
    const expectedPensionContrib = (12_000 / 12) * months;
    const expectedCash = 100 * months;
    const expectedStock = 50 * months;
    expect(attributionSummary.cumulativeContributions.pension).toBe(expectedPensionContrib);
    expect(attributionSummary.cumulativeContributions.cash).toBe(expectedCash);
    expect(attributionSummary.cumulativeContributions.stocks).toBe(expectedStock);

    for (const r of rows) {
      assertAttributionIdentity(r);
      assertPerAssetReconciles(r.assetAttribution);
    }
    expect(attributionSummary.byAsset.property.contributions).toBe(0);
    expect(attributionSummary.byAsset.pension.growth).toBe(0);
  });

  it('zero contributions: growth explains change in assets (no property inflation)', () => {
    const snap = baseSnapshot({
      pensionHoldings: 50_000,
      stocksAndShares: 0,
      cash: 0,
      propertyValue: 0,
      annualPensionContribution: 0,
      monthlyCashSavings: 0,
      monthlyStockSavings: 0,
    });
    const inputs = baseInputs({
      projectionYears: 2,
      pensionGrowthAnnualPct: 10,
      investmentGrowthAnnualPct: 0,
      cashGrowthAnnualPct: 0,
      contributionEscalationAnnualPct: 0,
      inflationAnnualPct: 0,
    });
    const { finalRow, attributionSummary } = computeProjectionSeries(inputs, snap);

    expect(attributionSummary.cumulativeContributions.total).toBe(0);
    expect(attributionSummary.cumulativeGrowth).toBeGreaterThan(0);
    expect(finalRow.totalAssets).toBeGreaterThan(attributionSummary.startingAssetsTotal);
    assertAttributionIdentity(finalRow);
    assertPerAssetReconciles(finalRow.assetAttribution);
    expect(attributionSummary.byAsset.pension.growth).toBeGreaterThan(0);
  });

  it('reconciles starting + contributions + growth to total assets on intermediate and final rows', () => {
    const snap = baseSnapshot({
      annualPensionContribution: 6_000,
      monthlyCashSavings: 200,
      monthlyStockSavings: 0,
    });
    const inputs = baseInputs({ projectionYears: 7 });
    const { rows } = computeProjectionSeries(inputs, snap);

    expect(rows.length).toBe(8);
    for (const r of rows) {
      assertAttributionIdentity(r);
      assertPerAssetReconciles(r.assetAttribution);
    }
    expect(rows[3].yearIndex).toBe(3);
    assertAttributionIdentity(rows[3]);
  });
});
