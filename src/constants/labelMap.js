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

  // ─── Pension benefit charts (titles composed with withDisplayPeriodLabel) ─
  chart_your_money_vs_free_money: 'Your money vs free money',
  chart_where_pension_benefits_from: 'Where your pension benefits come from',
  chart_your_contribution_detail: 'Your contribution detail',
  chart_free_money_detail: 'Free money detail',

  // ─── Persisted pension_inputs (Supabase) / DEFAULT_INPUTS state ───────────
  gross_salary: 'Gross Salary',
  bonus_income: 'Bonus (annual gross)',
  benefit_in_kind_taxable: 'Benefit in Kind (taxable, annual)',
  benefit_in_kind_tax_impact: 'Extra income tax from benefits (est.)',
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
  budget_tab: 'My Household Budget',
  net_worth_tab: 'Net Worth',
  projection_tab: 'Projection',
  projection_intro:
    'Illustrative projection using your current inputs. Figures are not a guarantee of future results.',
  projection_hover_attribution_hint:
    'Hover a pension, stocks, cash, or property amount to see cumulative contributions and cumulative growth for that asset through that year (table) or through the horizon (summary).',
  projection_attr_hover_contrib: 'Cumulative contributions',
  projection_attr_hover_growth: 'Cumulative growth',

  projection_section_inputs: 'Projection settings',
  projection_section_baseline: 'Values used from your data',
  projection_section_outputs: 'End of horizon',
  projection_section_table: 'Year by year',
  projection_section_assumptions: 'What this view does',

  projection_years: 'Horizon (years)',
  projection_pension_growth_pct: 'Annual growth (pension pot)',
  projection_investment_growth_pct: 'Annual growth (stocks and shares)',
  projection_cash_growth_pct: 'Annual growth (cash)',
  projection_contribution_escalation_pct: 'Annual change in contributions and budget savings additions',
  projection_inflation_pct: 'Annual change (property value only)',

  projection_baseline_pension_contribution: 'Annual pension contributions (from Pension & Pay)',
  projection_baseline_monthly_savings: 'Monthly budget savings (from Budget)',

  projection_out_pension: 'Projected pension pot',
  projection_out_investments: 'Projected stocks and shares',
  projection_out_cash: 'Projected cash',
  projection_out_net_worth: 'Projected net worth',

  projection_table_year: 'Year',
  projection_table_pension: 'Pension',
  projection_table_stocks: 'Stocks and shares',
  projection_table_cash: 'Cash',
  projection_table_property: 'Property value',
  projection_table_liabilities: 'Liabilities',
  projection_table_total_assets: 'Total assets',
  projection_table_net_worth: 'Net worth',

  projection_assumptions_body:
    'Figures compound once per year using the rates above. Pension funding uses total gross annual contributions from Pension & Pay. Stocks and shares receive the budget savings total (explicit savings plus committed goals) each year, escalated like pension contributions. Cash grows at its own rate. Property value changes at the property rate; liabilities stay at today’s total for this illustration. Tax, allowance rules, and real life changes are not modelled.',
  net_worth_completeness_caption: 'fields with valid amounts',
  net_worth_reset: 'Reset Net Worth',
  net_worth_export: 'Export Net Worth',
  net_worth_import: 'Import Net Worth',
  net_worth_import_error: 'Import could not be read',
  net_worth_last_updated_prefix: 'Last updated:',
  net_worth_last_updated_not_available: 'Not available',
  net_worth_storage_local: 'Storage: Local',
  net_worth_storage_synced: 'Storage: Synced',
  net_worth_storage_sync_unavailable: 'Storage: Sync unavailable',
  net_worth_storage_sync_error: 'Storage: Sync error',
  net_worth_edge_no_values: 'No values entered',
  net_worth_edge_ratio_basis: 'Ratio values use total assets as the basis',

  // ─── Net worth (summary) ─────────────────────────────────────────────────
  net_worth_total_assets: 'Total Assets',
  net_worth_total_liabilities: 'Total Liabilities',
  net_worth_net_worth: 'Net Worth',
  net_worth_section_assets: 'Assets',
  net_worth_section_liabilities: 'Liabilities',

  net_worth_asset_property_value: 'Property Value',
  net_worth_derived_property_equity: 'Derived Property Equity',
  net_worth_derived_property_equity_basis: 'Based on property value minus mortgage balance',
  net_worth_asset_cash: 'Cash',
  net_worth_asset_stocks_and_shares: 'Stocks and Shares',
  net_worth_asset_pension_holdings: 'Pension Holdings',

  net_worth_liability_mortgage_from_budget: 'Mortgage',
  net_worth_liability_mortgage_from_budget_basis: 'Derived from Budget mortgage entries',
  net_worth_liability_loans: 'Loans',
  net_worth_liability_credit_cards: 'Credit Cards',

  net_worth_section_insights: 'Insights',
  net_worth_insight_group_overview: 'Overview',
  net_worth_insight_group_liquidity: 'Liquidity',
  net_worth_insight_group_liabilities: 'Liabilities',
  net_worth_insight_group_asset_concentration: 'Asset Concentration',
  net_worth_insight_liquid_assets: 'Liquid Assets',
  net_worth_insight_liquid_assets_basis:
    'Includes cash balances only; stocks and shares are not included in this figure.',
  net_worth_insight_liquidity_ratio: 'Liquidity Ratio',
  net_worth_insight_debt_ratio: 'Debt Ratio',
  net_worth_insight_pension_share_of_assets: 'Pension Share of Total Assets',
  net_worth_insight_property_share_of_assets: 'Property Share of Total Assets',
  net_worth_insight_cash_share_of_assets: 'Cash Share of Total Assets',
  net_worth_insight_stocks_and_shares_share_of_assets: 'Stocks and Shares Share of Total Assets',
  net_worth_insight_emergency_fund_months: 'Emergency Fund Months',

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
