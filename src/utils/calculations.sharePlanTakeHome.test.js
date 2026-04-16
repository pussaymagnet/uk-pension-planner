import { describe, it, expect } from 'vitest';
import {
  calculateTakeHome,
  calculateFullPosition,
  SHARE_PLAN_TYPES,
} from './calculations.js';

describe('calculateTakeHome share plan', () => {
  const salary = 50_000;
  const region = 'england';

  it('pre-tax share reduces net take-home vs none (lower IT/NI on reduced PAYE cash)', () => {
    const none = calculateTakeHome(salary, 0, 0, region, 0, 0, {});
    const pre = calculateTakeHome(salary, 0, 0, region, 0, 0, {
      sharePlanContribution: 2_400,
      sharePlanType: SHARE_PLAN_TYPES.PRE_TAX,
    });
    expect(pre.sharePlanPreTaxApplied).toBe(2_400);
    expect(pre.sharePlanPostTaxDeducted).toBe(0);
    expect(pre.estimatedIncomeTax + pre.estimatedNI).toBeLessThan(
      none.estimatedIncomeTax + none.estimatedNI,
    );
    expect(pre.netTakeHomeAnnual).toBeLessThan(none.netTakeHomeAnnual);
    // Not a full gross £ cut from net (tax/NI saved on the slice)
    expect(none.netTakeHomeAnnual - pre.netTakeHomeAnnual).toBeLessThan(2_400);
  });

  it('post-tax share deducts full contribution from net after pension; no IT/NI change vs none', () => {
    const none = calculateTakeHome(salary, 0, 0, region, 0, 0, {});
    const post = calculateTakeHome(salary, 0, 0, region, 0, 0, {
      sharePlanContribution: 1_800,
      sharePlanType: SHARE_PLAN_TYPES.POST_TAX,
    });
    expect(post.sharePlanPreTaxApplied).toBe(0);
    expect(post.sharePlanPostTaxDeducted).toBe(1_800);
    expect(post.estimatedIncomeTax).toBe(none.estimatedIncomeTax);
    expect(post.estimatedNI).toBe(none.estimatedNI);
    expect(none.netTakeHomeAnnual - post.netTakeHomeAnnual).toBeCloseTo(1_800, 5);
  });

  it('post-tax share floors net at zero when contribution exceeds net', () => {
    const post = calculateTakeHome(salary, 0, 0, region, 0, 0, {
      sharePlanContribution: 1e9,
      sharePlanType: SHARE_PLAN_TYPES.POST_TAX,
    });
    expect(post.netTakeHomeAnnual).toBe(0);
    expect(post.netTakeHomeMonthly).toBe(0);
  });

  it('pre-tax share floors PAYE cash at zero when contribution exceeds employment cash', () => {
    const pre = calculateTakeHome(10_000, 0, 0, region, 0, 0, {
      sharePlanContribution: 50_000,
      sharePlanType: SHARE_PLAN_TYPES.PRE_TAX,
    });
    expect(pre.netTakeHomeAnnual).toBe(0);
  });
});

describe('calculateFullPosition share plan + Plan 4 income', () => {
  it('pre-tax share lowers Plan 4 repayment vs same inputs without (lower PAYE gross)', () => {
    const withoutShare = calculateFullPosition(
      40_000,
      5,
      0,
      0,
      'scotland',
      0,
      'post_tax',
      'plan_4',
      0,
      0,
    );
    const withPreTaxShare = calculateFullPosition(
      40_000,
      5,
      0,
      0,
      'scotland',
      1_200,
      'pre_tax',
      'plan_4',
      0,
      0,
    );
    expect(withPreTaxShare.sharePlanDeductionApplied).toBe(1_200);
    expect(withPreTaxShare.takeHome.studentLoanRepaymentAnnual).toBeLessThan(
      withoutShare.takeHome.studentLoanRepaymentAnnual,
    );
  });

  it('Budget-facing net monthly reflects share plan in take-home', () => {
    const none = calculateFullPosition(45_000, 0, 0, 0, 'england', 0, 'post_tax', null, 0, 0);
    const withPost = calculateFullPosition(
      45_000,
      0,
      0,
      0,
      'england',
      3_000,
      'post_tax',
      null,
      0,
      0,
    );
    expect(withPost.takeHome.netTakeHomeMonthly).toBeLessThan(none.takeHome.netTakeHomeMonthly);
  });
});
