/**
 * Central display strings keyed by backend column names and calculation property names
 * (snake_case). Prefer matching Supabase / state sync keys in App.jsx.
 *
 * getLabel(key) uses this map, then formatLabel(key).
 */
export const labelMap = {
  // ─── Section / strip labels ─────────────────────────────────────────────────
  pension_inputs: 'Pension inputs',
  remaining_needed: 'Net pension to reach threshold (guide)',
  tax_band: 'Tax band',
  adjusted_income: 'Adjusted income',
  net_take_home: 'Net take-home',
  more_detail: 'More detail',
  hide_detail: 'Hide detail',
  dropped_tax_band: 'Band changed with personal pension',

  // ─── Persisted pension_inputs (Supabase) / DEFAULT_INPUTS state ───────────
  gross_salary: 'Gross Salary',
  employee_value: 'Employee Pension Contribution',
  employer_value: 'Employer Pension Contribution',
  personal_pension_net: 'Personal Pension (Net Contribution)',
  share_plan_contribution: 'Share Plan Contribution',
  share_plan_type: 'Share Plan Type',
  share_plan_type_post_tax: 'After tax',
  share_plan_type_pre_tax: 'Before tax',
  student_loan_plan_plan_4: 'Scottish student loan (Plan 4)',
  contribution_mode: 'Contribution Mode',
  contribution_mode_percent: 'Percent of pay',
  contribution_mode_nominal: 'Fixed £ amount',
  display_period: 'Display Period',
  display_period_annual: 'Per year',
  display_period_monthly: 'Per month',
  tax_region: 'Tax Region',
  tax_region_england: 'England & Wales',
  tax_region_scotland: 'Scotland',

  // ─── App tabs ──────────────────────────────────────────────────────────────
  pension_tab: 'Pension & Pay',
  budget_tab: 'Household Budget',

  // ─── Period suffixes (InputForm higher-band hint, etc.) ─────────────────────
  slash_month: '/month',
  slash_year: '/year',

  // ─── PensionTaxPanel extra copy ────────────────────────────────────────────
  self_assessment_relief: 'Self assessment relief',
  annual_allowance_cap: 'Annual allowance cap',
  annual_allowance_section: 'Annual allowance',
  annual_allowance_help: 'About annual allowance',
  annual_allowance_popover:
    'This bar shows how much of your pension annual allowance is used this tax year. We add salary sacrifice, employer contributions, and your personal pension (grossed up from the net you pay in). The cap is the lower of £60,000 and your gross salary. Remaining is what is left under that cap. This app does not model allowance taper for high earners or carry-forward from earlier years.',
  annual_allowance_used: 'Used',
  annual_allowance_remaining: 'Remaining',
};
