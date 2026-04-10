import { getPensionBenefitBreakdown } from './calculations.js';

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
 * @returns {{
 *   summary: { label: string, yourMoney: number, freeMoney: number, grandTotal: number }[],
 *   detailed: { label: string, value: number, type: 'your_money' | 'free_money', source_key: string }[],
 * }}
 */
export function buildPensionValueStackedChartData(position, existingBreakdown = null) {
  const netPaid = Number(position?.personalPension?.netPaid) || 0;
  const sacrificeGross = Number(position?.sacrifice?.sacrificeGross) || 0;
  const yourMoney = r2(netPaid + sacrificeGross);

  const breakdown =
    existingBreakdown && typeof existingBreakdown === 'object'
      ? existingBreakdown
      : getPensionBenefitBreakdown(position).breakdown;

  const freeMoney = r2(Number(breakdown.total_pension_benefit) || 0);
  const grandTotal = r2(yourMoney + freeMoney);

  const detailed = [
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
