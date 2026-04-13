import { getPensionBenefitBreakdown } from './calculations.js';
import { annualAmountForDisplay } from './displayPeriodMoney.js';

const r2 = (n) => Math.round(Number(n) * 100) / 100;

/** Display labels for detailed free-money rows (source_key → UI label). */
const FREE_MONEY_DETAIL = [
  { source_key: 'employer_pension_contribution', label: 'Employer' },
  { source_key: 'government_top_up_from_personal_pension', label: 'Gov Top-Up' },
  { source_key: 'self_assessment_relief', label: 'Self Assessment' },
  { source_key: 'income_tax_saved_from_salary_sacrifice', label: 'Tax Saved' },
  { source_key: 'national_insurance_saved_from_salary_sacrifice', label: 'NI Saved' },
];

/**
 * Classifies existing `calculateFullPosition` output into Your Money vs Free Money.
 * No tax math — only reads `position` and optionally reuses `getPensionBenefitBreakdown` output.
 *
 * @param {object} position — return value of calculateFullPosition
 * @param {object} [existingBreakdown] — if provided, use instead of calling getPensionBenefitBreakdown again
 * @param {'annual'|'monthly'} [displayPeriod='annual'] — display-only; underlying figures stay annual
 * @returns {{
 *   summary: { label: string, yourMoney: number, freeMoney: number, grandTotal: number }[],
 *   detailed: { label: string, value: number, type: 'your_money' | 'free_money', source_key: string }[],
 * }}
 */
export function buildPensionValueStackedChartData(
  position,
  existingBreakdown = null,
  displayPeriod = 'annual',
) {
  const netPaid = Number(position?.personalPension?.netPaid) || 0;
  const sacrificeGross = Number(position?.sacrifice?.sacrificeGross) || 0;

  const breakdown =
    existingBreakdown && typeof existingBreakdown === 'object'
      ? existingBreakdown
      : getPensionBenefitBreakdown(position).breakdown;

  const detailedAnnual = [
    {
      label: 'Personal pension (net)',
      value: r2(netPaid),
      type: 'your_money',
      source_key: 'personal_pension_net',
    },
    {
      label: 'Salary sacrifice',
      value: r2(sacrificeGross),
      type: 'your_money',
      source_key: 'salary_sacrifice_gross',
    },
    ...FREE_MONEY_DETAIL.map(({ source_key, label }) => ({
      label,
      value: r2(Number(breakdown[source_key]) || 0),
      type: 'free_money',
      source_key,
    })),
  ];

  const detailed = detailedAnnual.map((d) => ({
    ...d,
    value: annualAmountForDisplay(d.value, displayPeriod),
  }));

  const yourMoney = r2(
    detailed.filter((d) => d.type === 'your_money').reduce((s, d) => s + d.value, 0),
  );
  const freeMoney = r2(
    detailed.filter((d) => d.type === 'free_money').reduce((s, d) => s + d.value, 0),
  );
  const grandTotal = r2(yourMoney + freeMoney);

  return {
    summary: [
      {
        label: 'Pension Value',
        yourMoney,
        freeMoney,
        grandTotal,
      },
    ],
    detailed,
  };
}
