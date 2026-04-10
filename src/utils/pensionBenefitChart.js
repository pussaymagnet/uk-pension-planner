/**
 * Transforms getPensionBenefitBreakdown().breakdown into chart rows.
 * No recalculation — reads numeric fields only. Excludes total_pension_benefit.
 */

const ROW_DEFS = [
  { source_key: 'government_top_up_from_personal_pension', label: 'Government Top-Up' },
  { source_key: 'self_assessment_relief', label: 'Self Assessment Relief' },
  { source_key: 'employer_pension_contribution', label: 'Employer Contribution' },
  { source_key: 'income_tax_saved_from_salary_sacrifice', label: 'Income Tax Saved' },
  { source_key: 'national_insurance_saved_from_salary_sacrifice', label: 'NI Saved' },
];

/**
 * @param {object} breakdown — getPensionBenefitBreakdown(position).breakdown
 * @param {{ hideZeros?: boolean, sortDesc?: boolean }} [options]
 * @returns {{ label: string, value: number, source_key: string }[]}
 */
export function buildPensionBenefitChartData(breakdown, options = {}) {
  const { hideZeros = true, sortDesc = true } = options;
  if (!breakdown || typeof breakdown !== 'object') return [];

  let rows = ROW_DEFS.map(({ source_key, label }) => ({
    label,
    source_key,
    value: Number(breakdown[source_key]) || 0,
  }));

  if (hideZeros) {
    rows = rows.filter((r) => r.value > 0);
  }
  if (sortDesc) {
    rows.sort((a, b) => b.value - a.value);
  }

  return rows;
}
