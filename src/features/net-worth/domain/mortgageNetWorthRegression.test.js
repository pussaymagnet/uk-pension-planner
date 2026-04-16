/**
 * Regression: Budget-derived mortgage → Net Worth (no manual mortgage persistence).
 * Pure functions only — no localStorage / React.
 */
import { describe, it, expect } from 'vitest';
import {
  getDefaultNetWorthInputs,
  normalizeNetWorthInputs,
  serializeNetWorthInputs,
  NET_WORTH_LEGACY_MORTGAGE_FIELD,
} from './netWorthStorage.js';
import { computeNetWorthSummary, safeMoney } from './netWorthSummary.js';
import {
  buildMortgageSummaryFromExpenditures,
  HOUSING_MORTGAGE_CATEGORY,
  normalizeMortgageMirrorSlice,
} from '../features/budget/domain/mortgageExpenditure.js';

/** Same rule as `App.jsx` `derivedMortgageBalance` useMemo (Budget mirror summary). */
function derivedMortgageFromMirrorSummary(mirrorMortgage) {
  if (!mirrorMortgage?.enabled) return 0;
  return safeMoney(mirrorMortgage.totalBalance);
}

const emptyAssets = {
  propertyValue: 0,
  cash: 0,
  stocksAndShares: 0,
  pensionHoldings: 0,
};

describe('normalizeNetWorthInputs — legacy payloads', () => {
  it('strips mortgageBalance from canonical liabilities while preserving loans / credit cards', () => {
    const raw = {
      liabilities: {
        [NET_WORTH_LEGACY_MORTGAGE_FIELD]: 200000,
        loans: 10000,
        creditCards: 2000,
      },
    };
    const out = normalizeNetWorthInputs(raw);
    expect(out.liabilities).toEqual({ loans: 10000, creditCards: 2000 });
    expect(Object.prototype.hasOwnProperty.call(out.liabilities, NET_WORTH_LEGACY_MORTGAGE_FIELD)).toBe(false);
  });

  it('does not throw on legacy-heavy payloads', () => {
    expect(() =>
      normalizeNetWorthInputs({
        liabilities: { mortgageBalance: 999999, loans: 0, creditCards: 0 },
      }),
    ).not.toThrow();
  });
});

describe('normalizeNetWorthInputs — property equity migration', () => {
  it('uses legacy mortgage only for propertyValue recovery, then drops mortgage from state', () => {
    const raw = {
      assets: {
        propertyEquity: 50000,
      },
      liabilities: {
        mortgageBalance: 200000,
      },
    };
    const out = normalizeNetWorthInputs(raw);
    expect(out.assets.propertyValue).toBe(250000);
    expect(out.liabilities).toEqual({ loans: 0, creditCards: 0 });
    expect(Object.prototype.hasOwnProperty.call(out.liabilities, 'mortgageBalance')).toBe(false);
  });
});

describe('getDefaultNetWorthInputs', () => {
  it('does not include manual mortgage on liabilities', () => {
    const d = getDefaultNetWorthInputs();
    expect(Object.keys(d.liabilities).sort()).toEqual(['creditCards', 'loans']);
  });
});

describe('Persistence strip (export / save simulation)', () => {
  it('after normalize, serialized JSON has no mortgageBalance', () => {
    const legacy = {
      assets: { ...emptyAssets, cash: 5000 },
      liabilities: { mortgageBalance: 200000, loans: 10000, creditCards: 2000 },
    };
    const canonical = normalizeNetWorthInputs(legacy);
    const json = serializeNetWorthInputs(canonical);
    expect(json).not.toContain('mortgageBalance');
    const roundTrip = JSON.parse(json);
    expect(roundTrip.liabilities).toEqual({ loans: 10000, creditCards: 2000 });
  });
});

describe('normalizeMortgageMirrorSlice (persisted mirror blob)', () => {
  it('does not trust enabled/totalBalance without valid rows — avoids stale JSON', () => {
    const o = normalizeMortgageMirrorSlice({ enabled: true, totalBalance: 999000, rows: [] });
    expect(o.enabled).toBe(false);
    expect(o.totalBalance).toBe(0);
  });
});

describe('Budget mirror → total liabilities (computeNetWorthSummary)', () => {
  it('uses mirror totalBalance + manual loans + credit cards exactly once', () => {
    const expenditures = [
      {
        id: 'm1',
        category: HOUSING_MORTGAGE_CATEGORY,
        metadata: {
          currentBalance: 180000,
          annualInterestRate: 4,
          remainingTermMonths: 240,
        },
      },
    ];
    const mirror = buildMortgageSummaryFromExpenditures(expenditures);
    expect(mirror.enabled).toBe(true);
    expect(mirror.totalBalance).toBe(180000);

    const derived = derivedMortgageFromMirrorSummary(mirror);
    expect(derived).toBe(180000);

    const { totalLiabilities } = computeNetWorthSummary(
      emptyAssets,
      { loans: 10000, creditCards: 2000 },
      derived,
    );
    expect(totalLiabilities).toBe(180000 + 10000 + 2000);
  });

  it('when mirror has no mortgage (enabled false), liability mortgage contribution is 0', () => {
    const mirror = buildMortgageSummaryFromExpenditures([]);
    expect(mirror.enabled).toBe(false);
    const derived = derivedMortgageFromMirrorSummary(mirror);
    expect(derived).toBe(0);
    const { totalLiabilities } = computeNetWorthSummary(
      { ...emptyAssets, cash: 10000 },
      { loans: 5000, creditCards: 500 },
      derived,
    );
    expect(totalLiabilities).toBe(5500);
  });
});

describe('Double counting protection', () => {
  it('ignores legacy mortgage in manual liabilities object when deriving totals from Budget', () => {
    const normalized = normalizeNetWorthInputs({
      liabilities: { mortgageBalance: 200000, loans: 10000, creditCards: 2000 },
    });
    const budgetDerived = 180000;
    const { totalLiabilities } = computeNetWorthSummary(
      emptyAssets,
      normalized.liabilities,
      budgetDerived,
    );
    expect(totalLiabilities).toBe(180000 + 10000 + 2000);
  });

  it('even if a malicious object includes mortgageBalance alongside Budget-derived amount, summary ignores stored mortgage', () => {
    const { totalLiabilities } = computeNetWorthSummary(
      emptyAssets,
      { mortgageBalance: 200000, loans: 10000, creditCards: 2000 },
      180000,
    );
    expect(totalLiabilities).toBe(192000);
  });
});
