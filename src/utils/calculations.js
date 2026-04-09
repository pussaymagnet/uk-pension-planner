/**
 * calculations.js
 * ALL business logic lives here. No hardcoded values — every figure
 * is pulled from TAX_RULES so that updating taxRules.js each April
 * is the only change required.
 *
 * Pension contribution model:
 *  - Salary sacrifice : employee gives up gross pay → reduces income tax AND NI.
 *  - Personal pension : employee pays from net pay → HMRC adds basic-rate top-up
 *                       (relief at source). Higher / additional rate payers claim
 *                       extra via Self Assessment.
 */

import { TAX_RULES, getIncomeTaxRules, normalizeTaxRegion } from '../data/taxRules';

/** Scottish Student Loan Plan 4 — must match {@link calculateStudentLoanRepayment} eligibility */
export const STUDENT_LOAN_PLAN_4 = 'plan_4';

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** Round to nearest penny */
const round2 = (n) => Math.round(n * 100) / 100;

// ----------------------------------------------------------------
// Share plan (pre-tax / post-tax) — helpers for adjusted income
// ----------------------------------------------------------------
/**
 * **Pre-tax** share plans (e.g. SIP or share purchase via salary sacrifice): the amount is
 * deducted from gross pay before PAYE, so it reduces taxable income and belongs in the same
 * stack as salary sacrifice for banding.
 *
 * **Post-tax** contributions: you buy shares from net pay after tax; they do **not** reduce
 * taxable employment income in this model, so they are ignored for adjusted income / tax band.
 */
export const SHARE_PLAN_TYPES = Object.freeze({
  PRE_TAX: 'pre_tax',
  POST_TAX: 'post_tax',
});

/**
 * Annual £ that reduces taxable income for share-plan modelling. Only {@link SHARE_PLAN_TYPES.PRE_TAX}.
 *
 * @param {number} sharePlanContribution
 * @param {'pre_tax' | 'post_tax'} sharePlanType
 * @returns {number}
 */
export const getSharePlanDeduction = (sharePlanContribution, sharePlanType) => {
  if (sharePlanType !== SHARE_PLAN_TYPES.PRE_TAX && sharePlanType !== 'pre_tax') return 0;
  return round2(Math.max(0, Number(sharePlanContribution) || 0));
};

/**
 * Pure building blocks for adjusted income after salary sacrifice, gross relief-at-source
 * pension, and optional pre-tax share plan. Extensible: add further line items to `deductions`.
 *
 * @param {object} params
 * @param {number} params.grossIncome
 * @param {number} params.salarySacrificeGross
 * @param {number} params.grossPension  Gross pension (net / 0.8)
 * @param {number} [params.sharePlanContribution=0]
 * @param {'pre_tax' | 'post_tax'} [params.sharePlanType='post_tax']
 * @returns {{
 *   updated_adjusted_income: number,
 *   share_plan_deduction_applied: number,
 *   deductions: Array<{ key: string, amount: number }>,
 *   total_deductions: number,
 *   trace: { inputs: object, steps: Array<{ id: number, label: string, detail: string, value: number }> },
 * }}
 */
export const calculateAdjustedIncomeParts = ({
  grossIncome,
  salarySacrificeGross,
  grossPension,
  sharePlanContribution = 0,
  sharePlanType = SHARE_PLAN_TYPES.POST_TAX,
}) => {
  const gross = Number(grossIncome) || 0;
  const sacrifice = round2(Number(salarySacrificeGross) || 0);
  const gPension = round2(Number(grossPension) || 0);
  const share_plan_deduction_applied = getSharePlanDeduction(sharePlanContribution, sharePlanType);

  const deductions = [
    { key: 'salary_sacrifice', amount: sacrifice },
    { key: 'gross_pension', amount: gPension },
    { key: 'share_plan', amount: share_plan_deduction_applied },
  ];
  const total_deductions = round2(deductions.reduce((s, d) => s + d.amount, 0));
  const updated_adjusted_income = Math.max(0, round2(gross - total_deductions));

  const trace = {
    inputs: {
      gross_income: gross,
      salary_sacrifice: sacrifice,
      gross_pension: gPension,
      share_plan_contribution: Number(sharePlanContribution) || 0,
      share_plan_type: sharePlanType,
    },
    steps: [
      {
        id: 1,
        label: 'Gross pension',
        detail: 'pension_contribution grossed up (net / reliefAtSourceMultiplier)',
        value: gPension,
      },
      {
        id: 2,
        label: 'Share plan deduction',
        detail:
          share_plan_deduction_applied > 0
            ? 'pre_tax: share_plan_contribution reduces taxable income'
            : 'post_tax or zero: no deduction from taxable income',
        value: share_plan_deduction_applied,
      },
      {
        id: 3,
        label: 'Adjusted income',
        detail: 'gross_income − salary_sacrifice − gross_pension − share_plan_deduction (min 0)',
        value: updated_adjusted_income,
      },
    ],
  };

  return {
    updated_adjusted_income,
    share_plan_deduction_applied,
    deductions,
    total_deductions,
    trace,
  };
};

/** @typedef {{ sharePlanContribution?: number, sharePlanType?: 'pre_tax' | 'post_tax' }} SharePlanOptions */

// ----------------------------------------------------------------
// Conversion helpers (used when toggling between % and £ input modes)
// ----------------------------------------------------------------

/**
 * Convert a nominal annual £ amount into a % of gross salary.
 */
export const nominalToPercent = (nominalAmount, grossSalary) => {
  const amount = Number(nominalAmount) || 0;
  const salary = Number(grossSalary) || 0;
  if (!salary) return 0;
  return Math.round((amount / salary) * 10000) / 100;
};

/**
 * Convert a % of gross salary into a nominal annual £ amount.
 */
export const percentToNominal = (percent, grossSalary) => {
  const pct    = Number(percent) || 0;
  const salary = Number(grossSalary) || 0;
  return Math.round((pct / 100) * salary);
};

/** Format as £X,XXX with optional decimal places */
export const formatCurrency = (amount, decimals = 0) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

// ----------------------------------------------------------------
// Private helper: income tax + NI on any salary figure
// ----------------------------------------------------------------
/**
 * Returns [incomeTax, ni] for a given salary using TAX_RULES.
 * Used internally for salary-sacrifice "difference" calculations.
 * @param {number} salary
 * @returns {[number, number]}
 */
const _incomeTaxAndNI = (salary, taxRegion = 'england') => {
  const region = normalizeTaxRegion(taxRegion);
  const { bands } = getIncomeTaxRules(region);
  let incomeTax = 0;
  for (const band of bands) {
    if (salary > band.min - 1 && band.rate > 0) {
      const taxableInBand = Math.min(salary, band.max) - (band.min - 1);
      incomeTax += (taxableInBand * band.rate) / 100;
    }
  }

  // Class 1 primary NI
  const { primaryThreshold: pt, upperEarningsLimit: uel,
    mainRate, upperRate } = TAX_RULES.nationalInsurance;
  let ni = 0;
  if (salary > pt) {
    ni += (Math.min(salary, uel) - pt) * mainRate / 100;
    if (salary > uel) ni += (salary - uel) * upperRate / 100;
  }

  return [round2(incomeTax), round2(ni)];
};

// ----------------------------------------------------------------
// 1. getTaxBand
// ----------------------------------------------------------------
/**
 * Returns the income-tax band the salary falls into.
 * Pass the EFFECTIVE salary (after any sacrifice) for accurate band
 * identification.
 *
 * @param {number} grossSalary  Annual effective salary in £
 * @returns {string}  Band name e.g. "Basic Rate"
 */
export const getTaxBand = (grossSalary, taxRegion = 'england') => {
  const region = normalizeTaxRegion(taxRegion);
  const { bands } = getIncomeTaxRules(region);
  const salary = Number(grossSalary) || 0;
  /** Contiguous bands: [min, nextMin) for all but last; avoids gaps at £ boundaries with decimals (e.g. £43,662.50). */
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i];
    if (i + 1 < bands.length) {
      const nextMin = bands[i + 1].min;
      if (salary >= band.min && salary < nextMin) {
        return band.name;
      }
    } else if (salary >= band.min && salary <= band.max) {
      return band.name;
    }
  }
  return bands[bands.length - 1].name;
};

/**
 * Marginal income tax rate (%) on the slice of income containing this salary.
 */
export const getMarginalIncomeTaxRate = (grossSalary, taxRegion = 'england') => {
  const region = normalizeTaxRegion(taxRegion);
  const { bands } = getIncomeTaxRules(region);
  const salary = Number(grossSalary) || 0;
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i];
    if (i + 1 < bands.length) {
      const nextMin = bands[i + 1].min;
      if (salary >= band.min && salary < nextMin) {
        return band.rate;
      }
    } else if (salary >= band.min && salary <= band.max) {
      return band.rate;
    }
  }
  return bands[bands.length - 1].rate;
};

/**
 * Maximum income still outside the region’s **higher-rate** band: one £ below the band named
 * `Higher Rate` (England / Wales / NI) or `Scottish Higher Rate` (Scotland), from {@link getIncomeTaxRules}.
 * In the rest of the UK this equals the top of the basic band; in Scotland it is the top of
 * intermediate (not Scottish Basic). Figures live in `taxRules.js` — no hardcoded £ amounts.
 *
 * @param {'england' | 'scotland'} [taxRegion='england']
 * @returns {number} Income limit in £, or `0` if the higher-rate band is missing from config.
 */
export const getPreHigherRateIncomeLimit = (taxRegion = 'england') => {
  const region = normalizeTaxRegion(taxRegion);
  const { bands } = getIncomeTaxRules(region);
  const higherName = region === 'scotland' ? 'Scottish Higher Rate' : 'Higher Rate';
  const band = bands.find((b) => b.name === higherName);
  return band != null ? band.min - 1 : 0;
};

/**
 * Adjusted income (gross minus pre-tax salary sacrifice) and the net relief-at-source
 * personal pension payment that would bring income to just below the higher-rate threshold
 * (same income stack as {@link getTaxBand}; no PA taper for £100k–£125k).
 *
 * Required net contribution uses {@link TAX_RULES.pension.taxRelief.reliefAtSourceMultiplier}
 * (0.8): net paid is 80% of the gross income reduction because basic-rate relief at source
 * tops up the other 20% (gross = net / 0.8).
 *
 * @param {number} grossIncome Total income before deductions, £/year
 * @param {number} salarySacrifice Employee pension sacrifice (pre-tax), £/year
 * @param {'england' | 'scotland'} [taxRegion='england']
 * @param {number} [sharePlanDeduction=0] Pre-tax share plan £/year (reduces income before higher-rate guide)
 * @returns {{
 *   adjusted_income: number,
 *   tax_band: string,
 *   pre_higher_threshold: number,
 *   required_gross_reduction: number,
 *   required_net_pension_contribution: number,
 *   trace: { inputs: object, steps: Array<{ id: number, label: string, detail: string, value: number|string }> },
 * }}
 */
export const calculateAdjustedIncomeAndPension = (
  grossIncome,
  salarySacrifice,
  taxRegion = 'england',
  sharePlanDeduction = 0,
) => {
  const region = normalizeTaxRegion(taxRegion);
  const gross = Number(grossIncome) || 0;
  const sacrifice = Number(salarySacrifice) || 0;
  const shareDed = round2(Math.max(0, Number(sharePlanDeduction) || 0));
  const adjusted_income = round2(gross - sacrifice - shareDed);
  const tax_band = getTaxBand(adjusted_income, region);
  const pre_higher_threshold = getPreHigherRateIncomeLimit(region);

  let required_gross_reduction = 0;
  if (pre_higher_threshold > 0 && adjusted_income > pre_higher_threshold) {
    required_gross_reduction = round2(adjusted_income - pre_higher_threshold);
  }

  const rasMult = TAX_RULES.pension.taxRelief.reliefAtSourceMultiplier;
  const required_net_pension_contribution =
    required_gross_reduction > 0
      ? round2(required_gross_reduction * rasMult)
      : 0;

  const trace = {
    inputs: {
      gross_income: gross,
      salary_sacrifice: sacrifice,
      share_plan_deduction: shareDed,
      tax_region: region === 'scotland' ? 'Scotland' : 'England',
    },
    steps: [
      {
        id: 1,
        label: 'Adjusted income',
        detail: 'gross_income − salary_sacrifice − share_plan_deduction (pre-tax only)',
        value: adjusted_income,
      },
      {
        id: 2,
        label: 'Tax band',
        detail: 'getTaxBand(adjusted_income, region)',
        value: tax_band,
      },
      {
        id: 3,
        label: 'Pre-higher-rate income limit',
        detail: 'getPreHigherRateIncomeLimit(region) from tax config (last £ before higher band)',
        value: pre_higher_threshold,
      },
      {
        id: 4,
        label: 'Required gross reduction',
        detail: 'adjusted_income − pre_higher_threshold (0 if already at or below limit)',
        value: required_gross_reduction,
      },
      {
        id: 5,
        label: 'Required net pension contribution',
        detail: 'required_gross_reduction × reliefAtSourceMultiplier (relief at source)',
        value: required_net_pension_contribution,
      },
    ],
  };

  return {
    adjusted_income,
    tax_band,
    pre_higher_threshold,
    required_gross_reduction,
    required_net_pension_contribution,
    trace,
  };
};

/**
 * Tax band and related figures after treating relief-at-source personal pension as reducing
 * taxable income: gross pension = net / {@link TAX_RULES.pension.taxRelief.reliefAtSourceMultiplier},
 * then adjusted income = gross − salary sacrifice − gross pension − pre-tax share plan (floored at 0).
 * Uses {@link getTaxBand} / {@link getMarginalIncomeTaxRate} — same bands for Scotland and England.
 *
 * @param {number} grossIncome
 * @param {number} salarySacrificeGross Annual £
 * @param {number} personalPensionNet Net annual £ (relief at source)
 * @param {'england' | 'scotland'} [taxRegion='england']
 * @param {SharePlanOptions} [sharePlanOptions]
 */
export const calculateDynamicTaxBand = (
  grossIncome,
  salarySacrificeGross,
  personalPensionNet,
  taxRegion = 'england',
  sharePlanOptions = {},
) => {
  const region = normalizeTaxRegion(taxRegion);
  const gross = Number(grossIncome) || 0;
  const sacrifice = Number(salarySacrificeGross) || 0;
  const ppNet = Number(personalPensionNet) || 0;
  const sharePlanType = sharePlanOptions.sharePlanType ?? SHARE_PLAN_TYPES.POST_TAX;
  const sharePlanContribution = Number(sharePlanOptions.sharePlanContribution) || 0;

  const rasMult = TAX_RULES.pension.taxRelief.reliefAtSourceMultiplier;
  const gross_pension = ppNet > 0 ? round2(ppNet / rasMult) : 0;

  const share_plan_deduction_applied = getSharePlanDeduction(sharePlanContribution, sharePlanType);
  const income_before_personal_pension = Math.max(
    0,
    round2(gross - sacrifice - share_plan_deduction_applied),
  );

  const incomeParts = calculateAdjustedIncomeParts({
    grossIncome: gross,
    salarySacrificeGross: sacrifice,
    grossPension: gross_pension,
    sharePlanContribution,
    sharePlanType,
  });
  const adjusted_income = incomeParts.updated_adjusted_income;

  const tax_band = getTaxBand(adjusted_income, region);
  const marginalIncomeTaxRate = getMarginalIncomeTaxRate(adjusted_income, region);

  const tax_band_before_personal_pension = getTaxBand(income_before_personal_pension, region);
  const marginal_rate_before_personal_pension = getMarginalIncomeTaxRate(
    income_before_personal_pension,
    region,
  );

  const has_dropped_tax_band =
    ppNet > 0 && marginalIncomeTaxRate < marginal_rate_before_personal_pension;

  const target = calculateAdjustedIncomeAndPension(
    gross,
    sacrifice,
    region,
    share_plan_deduction_applied,
  );
  /** Full net RAS pension to bring income to pre–higher-rate limit (from £0 PP). Not residual − ppNet, so InputForm hint stays stable while editing personal pension. */
  const remaining_needed = Math.max(
    0,
    round2(target.required_net_pension_contribution),
  );

  const trace = {
    inputs: {
      gross_income: gross,
      salary_sacrifice: sacrifice,
      personal_pension_net: ppNet,
      share_plan_contribution: sharePlanContribution,
      share_plan_type: sharePlanType,
    },
    steps: [
      {
        id: 1,
        label: 'Gross pension',
        detail: 'personal_pension_net / reliefAtSourceMultiplier',
        value: gross_pension,
      },
      incomeParts.trace.steps[1],
      incomeParts.trace.steps[2],
      {
        id: 4,
        label: 'Tax band',
        detail: 'getTaxBand(adjusted_income, region)',
        value: tax_band,
      },
    ],
  };

  return {
    adjusted_income,
    gross_pension,
    income_before_personal_pension,
    share_plan_deduction_applied,
    share_plan_contribution: sharePlanContribution,
    share_plan_type: sharePlanType,
    tax_band,
    marginalIncomeTaxRate,
    tax_band_before_personal_pension,
    marginal_rate_before_personal_pension,
    previous_tax_band: tax_band_before_personal_pension,
    new_tax_band: tax_band,
    has_dropped_tax_band,
    remaining_needed,
    adjustedIncomePartsTrace: incomeParts.trace,
    trace,
  };
};

/**
 * Additional income tax relief reclaimable through Self Assessment on relief-at-source (net)
 * personal pension / SIPP contributions.
 *
 * **Relief at source** already adds basic **20%** to the pension pot; the provider claims it
 * from HMRC. **Self Assessment** reclaims **(marginal − 20%)** on the slice of **gross**
 * pension that sits against income that **would** have been taxed above 20% **before** the
 * pension is applied (same idea as extending the basic-rate band).
 *
 * **Why we use income *before* personal pension:** if we only looked at **adjusted** income
 * after deducting gross pension, a large contribution could move you into Basic Rate — then
 * marginal would show 20% and relief would incorrectly show £0. Eligibility and the **cap**
 * use **salary after sacrifice but before** relief-at-source pension.
 *
 * **Why only part of the gross pension qualifies:** cap with {@link getPreHigherRateIncomeLimit}:
 * `min(gross_pension, max(0, income_before_pension − pre_higher_limit))`.
 *
 * @param {number} grossIncome
 * @param {number} salarySacrificeGross Annual £
 * @param {number} personalPensionNet Net annual £ (relief at source)
 * @param {'england' | 'scotland'} [taxRegion='england']
 * @param {SharePlanOptions} [sharePlanOptions]
 * @returns {{
 *   gross_pension: number,
 *   adjusted_income: number,
 *   tax_band: string,
 *   marginal_rate: number,
 *   income_before_personal_pension: number,
 *   tax_band_before: string,
 *   marginal_before: number,
 *   pre_higher_limit: number,
 *   income_above_pre_higher: number,
 *   higher_band_portion: number,
 *   eligible: boolean,
 *   extra_relief_rate: number,
 *   self_assessment_relief: number,
 *   trace: { inputs: object, steps: Array<{ id: number, label: string, detail: string, value: number|string }> },
 * }}
 */
export const calculateSelfAssessmentRelief = (
  grossIncome,
  salarySacrificeGross,
  personalPensionNet,
  taxRegion = 'england',
  sharePlanOptions = {},
) => {
  const region = normalizeTaxRegion(taxRegion);
  const dyn = calculateDynamicTaxBand(
    grossIncome,
    salarySacrificeGross,
    personalPensionNet,
    region,
    sharePlanOptions,
  );

  const gross_pension = dyn.gross_pension;
  const adjusted_income = dyn.adjusted_income;
  const tax_band = dyn.tax_band;
  const marginal_rate = dyn.marginalIncomeTaxRate;

  /** Income after sacrifice and pre-tax share plan, before relief-at-source pension — used for SA extra relief. */
  const income_before_personal_pension = dyn.income_before_personal_pension;
  const tax_band_before = getTaxBand(income_before_personal_pension, region);
  const marginal_before = getMarginalIncomeTaxRate(
    income_before_personal_pension,
    region,
  );

  const pre_higher_limit = getPreHigherRateIncomeLimit(region);
  /** Slice of income (before pension) above pre–higher-rate limit — caps how much gross pension can attract extra relief. */
  const income_above_pre_higher = round2(
    Math.max(0, income_before_personal_pension - pre_higher_limit),
  );
  const higher_band_portion = round2(
    Math.min(gross_pension, income_above_pre_higher),
  );

  /** Any slice of income before pension taxed above 20% (Starter 19% etc. excluded). */
  const eligible = marginal_before > 20;

  const extra_relief_rate =
    eligible ? round2((marginal_before - 20) / 100) : 0;

  const self_assessment_relief =
    eligible && higher_band_portion > 0
      ? round2(higher_band_portion * extra_relief_rate)
      : 0;

  const trace = {
    inputs: {
      gross_income: Number(grossIncome) || 0,
      salary_sacrifice: Number(salarySacrificeGross) || 0,
      personal_pension_net: Number(personalPensionNet) || 0,
      share_plan_contribution: Number(sharePlanOptions.sharePlanContribution) || 0,
      share_plan_type: sharePlanOptions.sharePlanType ?? SHARE_PLAN_TYPES.POST_TAX,
    },
    steps: [
      {
        id: 1,
        label: 'Gross pension',
        detail: 'personal_pension_net / reliefAtSourceMultiplier',
        value: gross_pension,
      },
      {
        id: 2,
        label: 'Adjusted income',
        detail: 'gross_income − salary_sacrifice − gross_pension − share_plan_deduction (min 0)',
        value: adjusted_income,
      },
      {
        id: 3,
        label: 'Income before personal pension',
        detail: 'gross_income − salary_sacrifice − share_plan_deduction (pre-tax only)',
        value: income_before_personal_pension,
      },
      {
        id: 4,
        label: 'Band / marginal (before pension) — used for SA',
        detail: 'getTaxBand / getMarginalIncomeTaxRate(income before pension)',
        value: `${tax_band_before} @ ${marginal_before}%`,
      },
      {
        id: 5,
        label: 'Band / marginal (after pension) — reference only',
        detail: 'from calculateDynamicTaxBand',
        value: `${tax_band} @ ${marginal_rate}%`,
      },
      {
        id: 6,
        label: 'Pre–higher-rate limit (cap anchor)',
        detail: 'getPreHigherRateIncomeLimit(region)',
        value: pre_higher_limit,
      },
      {
        id: 7,
        label: 'Income above pre–higher limit (before pension)',
        detail: 'max(0, income_before_pension − pre_higher_limit)',
        value: income_above_pre_higher,
      },
      {
        id: 8,
        label: 'Higher-band portion of gross pension',
        detail: 'min(gross_pension, income_above_pre_higher)',
        value: higher_band_portion,
      },
      {
        id: 9,
        label: 'Extra relief rate',
        detail: 'marginal_before > 20% → (marginal_before − 20) / 100, else 0',
        value: extra_relief_rate,
      },
      {
        id: 10,
        label: 'Self Assessment relief (£)',
        detail: 'higher_band_portion × extra_relief_rate',
        value: self_assessment_relief,
      },
    ],
  };

  return {
    gross_pension,
    adjusted_income,
    tax_band,
    marginal_rate,
    income_before_personal_pension,
    tax_band_before,
    marginal_before,
    pre_higher_limit,
    income_above_pre_higher,
    higher_band_portion,
    eligible,
    extra_relief_rate,
    self_assessment_relief,
    trace,
  };
};

// ----------------------------------------------------------------
// 2. calculateSacrificeContribution
// ----------------------------------------------------------------
/**
 * Models salary sacrifice correctly: the sacrificed amount reduces the
 * employee's TAXABLE income, saving BOTH income tax AND Class 1 NI.
 *
 * The "net cost" is the gross sacrifice minus those tax/NI savings.
 *
 * @param {number} grossSalary
 * @param {number} employeeSacrificePct  % of gross salary to sacrifice
 * @returns {{
 *   sacrificeGross:    number,  // annual gross going into pension
 *   incomeTaxSaving:   number,  // income tax saved vs no sacrifice
 *   niSaving:          number,  // NI saved vs no sacrifice
 *   totalTaxSaving:    number,  // incomeTaxSaving + niSaving
 *   netCostAnnual:     number,  // true net cost to employee
 *   netCostMonthly:    number,
 *   monthlyGross:      number,
 * }}
 */
export const calculateSacrificeContribution = (grossSalary, employeeSacrificePct, taxRegion = 'england') => {
  const salary = Number(grossSalary) || 0;
  const pct    = Number(employeeSacrificePct) || 0;
  const region = normalizeTaxRegion(taxRegion);

  const sacrificeGross = round2((pct / 100) * salary);
  const salaryReduced  = salary - sacrificeGross;

  const [itFull,    niFull]    = _incomeTaxAndNI(salary, region);
  const [itReduced, niReduced] = _incomeTaxAndNI(salaryReduced, region);

  const incomeTaxSaving = round2(itFull - itReduced);
  const niSaving        = round2(niFull - niReduced);
  const totalTaxSaving  = round2(incomeTaxSaving + niSaving);
  const netCostAnnual   = round2(sacrificeGross - totalTaxSaving);
  const netCostMonthly  = round2(netCostAnnual / 12);
  const monthlyGross    = round2(sacrificeGross / 12);

  return {
    sacrificeGross,
    incomeTaxSaving,
    niSaving,
    totalTaxSaving,
    netCostAnnual,
    netCostMonthly,
    monthlyGross,
  };
};

// ----------------------------------------------------------------
// 3. calculatePersonalPensionCost
// ----------------------------------------------------------------
/**
 * Models a personal pension / SIPP contribution using relief at source.
 * The employee pays a NET amount; the scheme provider claims 20%
 * basic-rate top-up from HMRC.
 * Higher / additional rate payers can reclaim further via Self Assessment.
 *
 * @param {number} grossSalary         Gross annual salary (before sacrifice)
 * @param {number} salarySacrificeGross Annual £ salary sacrifice (pre-tax)
 * @param {number} personalPensionNet  Net annual £ the employee actually pays
 * @param {'england' | 'scotland'} [taxRegion='england']
 * @param {SharePlanOptions} [sharePlanOptions]
 * @returns {{
 *   grossPension:    number,  // gross landed in pension pot (net / 0.8)
 *   netPaid:         number,  // same as input — what leaves the bank
 *   basicRelief:     number,  // 20% top-up from HMRC
 *   saRelief:        number,  // additional relief claimable via SA (band-capped)
 *   saReliefExtraPct: number, // effective average % of gross (saRelief / grossPension × 100)
 *   effectiveCost:   number,  // netPaid minus SA reclaim
 *   monthlyNetPaid:  number,
 *   selfAssessment:    object, // full {@link calculateSelfAssessmentRelief} result (trace, caps)
 * }}
 */
export const calculatePersonalPensionCost = (
  grossSalary,
  salarySacrificeGross,
  personalPensionNet,
  taxRegion = 'england',
  sharePlanOptions = {},
) => {
  const netPaid = Number(personalPensionNet) || 0;
  const region  = normalizeTaxRegion(taxRegion);

  const multiplier   = TAX_RULES.pension.taxRelief.reliefAtSourceMultiplier; // 0.8
  const grossPension = round2(netPaid / multiplier);
  const basicRelief  = round2(grossPension - netPaid);

  const selfAssessment = calculateSelfAssessmentRelief(
    grossSalary,
    salarySacrificeGross,
    personalPensionNet,
    region,
    sharePlanOptions,
  );
  const saRelief = selfAssessment.self_assessment_relief;
  const saReliefExtraPct =
    grossPension > 0 ? round2((saRelief / grossPension) * 100) : 0;
  const effectiveCost = round2(netPaid - saRelief);
  const monthlyNetPaid = round2(netPaid / 12);

  return {
    grossPension,
    netPaid,
    basicRelief,
    saRelief,
    saReliefExtraPct,
    /** @deprecated use saReliefExtraPct — effective average % on gross */
    saReliefPct: saReliefExtraPct,
    effectiveCost,
    monthlyNetPaid,
    selfAssessment,
  };
};

// ----------------------------------------------------------------
// 4. calculateRemainingAllowance
// ----------------------------------------------------------------
/**
 * Works out how much of the Annual Allowance has been used and what
 * remains, including a warning if it is being exceeded.
 *
 * Employee sacrifice + personal pension gross + employer all count toward
 * the Annual Allowance.
 *
 * @param {number} grossSalary
 * @param {number} employeeSacrificePct
 * @param {number} employerPercent
 * @param {number} personalPensionNet   Net £ personal pension (grossed up for AA)
 * @returns {{
 *   maxAllowance:       number,
 *   sacrificeGross:     number,
 *   personalPensionGross: number,
 *   employerGross:      number,
 *   usedAllowance:      number,
 *   remainingAllowance: number,
 *   percentUsed:        number,
 *   isExceeding:        boolean,
 *   warning:            string|null,
 * }}
 */
export const calculateRemainingAllowance = (
  grossSalary, employeeSacrificePct, employerPercent, personalPensionNet = 0,
) => {
  const salary  = Number(grossSalary) || 0;
  const sacPct  = Number(employeeSacrificePct) || 0;
  const erPct   = Number(employerPercent) || 0;
  const ppNet   = Number(personalPensionNet) || 0;

  const maxAllowance    = TAX_RULES.pension.annualAllowance.standard;
  const effectiveMax    = Math.min(maxAllowance, salary);

  const sacrificeGross      = round2((sacPct / 100) * salary);
  const employerGross       = round2((erPct  / 100) * salary);
  const multiplier          = TAX_RULES.pension.taxRelief.reliefAtSourceMultiplier;
  const personalPensionGross = round2(ppNet / multiplier);

  const usedAllowance       = round2(sacrificeGross + employerGross + personalPensionGross);
  const remainingAllowance  = round2(effectiveMax - usedAllowance);
  const percentUsed         = effectiveMax > 0
    ? Math.min(100, round2((usedAllowance / effectiveMax) * 100))
    : 0;

  const isExceeding = usedAllowance > effectiveMax;

  let warning = null;
  if (salary > 0 && usedAllowance > salary) {
    warning = `Total pension inputs (${formatCurrency(usedAllowance)}) are more than your full salary. For tax relief, what you and your employer pay in normally cannot be more than 100% of what you earn — check your figures.`;
  } else if (isExceeding) {
    const excess = round2(usedAllowance - effectiveMax);
    warning = `You are above the yearly pension savings limit by about ${formatCurrency(excess)}. Extra tax may apply on that part — ask an adviser or HMRC about unused allowance from past years.`;
  } else if (percentUsed >= 90) {
    warning = `You are using most (${percentUsed.toFixed(0)}%) of this year’s pension savings limit. Before paying in more, check whether you can use unused amounts from earlier years.`;
  }

  return {
    maxAllowance: effectiveMax,
    sacrificeGross,
    personalPensionGross,
    employerGross,
    usedAllowance,
    remainingAllowance,
    percentUsed,
    isExceeding,
    warning,
  };
};

// ----------------------------------------------------------------
// 5. calculateRecommendation
// ----------------------------------------------------------------
/**
 * Determines whether the combined contributions meet the 15% target.
 * Personal pension is grossed up before comparison.
 *
 * `eligibleForAdditionalRelief` and `additionalReliefAnnual` relate only to relief-at-source
 * (net) personal pension, capped to income taxed above 20%. `additionalReliefPercent` is the
 * effective average extra rate on gross personal pension (not headline marginal rate).
 *
 * @param {number} employeeSacrificePct
 * @param {number} employerPercent
 * @param {number} grossSalary
 * @param {number} personalPensionNet
 * @param {SharePlanOptions} [sharePlanOptions]
 */
export const calculateRecommendation = (
  employeeSacrificePct,
  employerPercent,
  grossSalary,
  personalPensionNet = 0,
  taxRegion = 'england',
  sharePlanOptions = {},
) => {
  const sacPct   = Number(employeeSacrificePct) || 0;
  const erPct    = Number(employerPercent) || 0;
  const salary   = Number(grossSalary) || 0;
  const ppNet    = Number(personalPensionNet) || 0;
  const region   = normalizeTaxRegion(taxRegion);
  const target   = TAX_RULES.pension.recommendation.minimumTotalPercentage;

  // Convert personal pension to gross equivalent % for like-for-like comparison
  const multiplier   = TAX_RULES.pension.taxRelief.reliefAtSourceMultiplier;
  const ppGrossAnnual = round2(ppNet / multiplier);
  const ppGrossPct   = salary > 0 ? round2((ppGrossAnnual / salary) * 100) : 0;

  const currentTotal = round2(sacPct + erPct + ppGrossPct);
  const meetsTarget  = currentTotal >= target;
  const shortfallPercent     = meetsTarget ? 0 : round2(target - currentTotal);
  const shortfallGrossAnnual = round2((shortfallPercent / 100) * salary);

  // Extra monthly net cost via personal pension to close the gap
  const monthlyNetNeeded = round2(
    (shortfallGrossAnnual * multiplier) / 12,
  );

  const sacrificeGross = round2((sacPct / 100) * salary);

  // Extra SA relief on gross personal pension (matches calculatePersonalPensionCost)
  const additionalReliefAnnual = calculateSelfAssessmentRelief(
    salary,
    sacrificeGross,
    ppNet,
    region,
    sharePlanOptions,
  ).self_assessment_relief;
  const eligibleForAdditionalRelief = additionalReliefAnnual > 0;
  const additionalReliefPercent =
    ppGrossAnnual > 0 ? round2((additionalReliefAnnual / ppGrossAnnual) * 100) : 0;

  let message = '';
  if (!salary) {
    message = 'Add your salary above to see how your pension savings compare to a simple rule of thumb.';
  } else if (meetsTarget) {
    message = `You’re saving about ${currentTotal}% of your pay into pensions (including what your employer adds). A common guide is at least ${target}% — you’re there.`;
  } else {
    message = `A simple guide is to aim for about ${target}% of pay into pensions in total (you + employer + any extra you pay yourself). You’re a bit short — paying about ${formatCurrency(monthlyNetNeeded)} more per month from your take-home into a personal pension would get you closer (exact amount depends on your scheme).`;
  }

  return {
    meetsTarget,
    currentTotal,
    target,
    shortfallPercent,
    shortfallGrossAnnual,
    monthlyNetNeeded,
    eligibleForAdditionalRelief,
    additionalReliefPercent,
    additionalReliefAnnual,
    message,
  };
};

// ----------------------------------------------------------------
// 5b. Student loan (Scotland Plan 4) + net income after repayment
// ----------------------------------------------------------------
/**
 * Scottish Student Loan Plan 4 repayment. Uses {@link TAX_RULES.studentLoan.plan4}.
 *
 * Student loan repayments are **not** tax-deductible: they do not reduce taxable income or
 * adjusted income for pension/tax-band purposes. They are collected after income tax and
 * NI (e.g. via PAYE) and act like a post-tax deduction — only net take-home is reduced.
 *
 * @param {object} params
 * @param {number} params.grossIncome Annual gross employment income (£) — same basis as salary input
 * @param {'england' | 'scotland'} params.taxRegion
 * @param {string | null | undefined} params.studentLoanPlan e.g. {@link STUDENT_LOAN_PLAN_4} or null
 * @returns {{
 *   student_loan_plan: string | null,
 *   student_loan_repayment: number,
 *   repayment_threshold_used: number,
 *   repayable_income: number,
 *   trace: { inputs: object, steps: Array<{ id: number, label: string, detail: string, value: number|string }> },
 * }}
 */
export const calculateStudentLoanRepayment = ({
  grossIncome,
  taxRegion,
  studentLoanPlan,
}) => {
  const region = normalizeTaxRegion(taxRegion);
  const gross = Math.max(0, round2(Number(grossIncome) || 0));
  const planRaw = studentLoanPlan == null || studentLoanPlan === '' ? null : String(studentLoanPlan);
  const plan = planRaw === STUDENT_LOAN_PLAN_4 ? STUDENT_LOAN_PLAN_4 : null;

  const { threshold, ratePercent } = TAX_RULES.studentLoan.plan4;
  const rate = ratePercent / 100;

  const eligible = region === 'scotland' && plan === STUDENT_LOAN_PLAN_4;

  let repayable_income = 0;
  let student_loan_repayment = 0;

  if (eligible) {
    repayable_income = Math.max(0, round2(gross - threshold));
    student_loan_repayment = round2(repayable_income * rate);
  }

  const trace = {
    inputs: {
      gross_income: gross,
      student_loan_plan: planRaw,
      tax_region: region,
    },
    steps: [
      {
        id: 1,
        label: 'Eligibility',
        detail:
          'Scotland + Plan 4 only; otherwise repayment = 0',
        value: eligible ? 'yes' : 'no',
      },
      {
        id: 2,
        label: 'Repayable income',
        detail: `max(0, gross_income − threshold £${threshold.toLocaleString('en-GB')})`,
        value: repayable_income,
      },
      {
        id: 3,
        label: 'Student loan repayment',
        detail: `repayable_income × ${ratePercent}%`,
        value: student_loan_repayment,
      },
    ],
  };

  return {
    student_loan_plan: eligible ? plan : null,
    student_loan_repayment,
    repayment_threshold_used: eligible ? threshold : 0,
    repayable_income,
    trace,
  };
};

/**
 * Applies Plan 4 student loan repayment **only** to net take-home (after tax, NI, pension).
 * Does **not** call or affect {@link calculateAdjustedIncomeParts} / adjusted income.
 *
 * @param {object} params
 * @param {number} params.netIncomeBeforeStudentLoan Annual £ after tax, NI, and net personal pension
 * @param {number} params.grossIncome Annual gross — for Plan 4 repayment band only
 * @param {'england' | 'scotland'} params.taxRegion
 * @param {string | null | undefined} params.studentLoanPlan
 * @returns {{
 *   student_loan_plan: string | null,
 *   student_loan_repayment: number,
 *   repayment_threshold_used: number,
 *   repayable_income: number,
 *   net_income_before_student_loan: number,
 *   net_income_after_student_loan: number,
 *   trace: { inputs: object, steps: Array<{ id: number, label: string, detail: string, value: number|string }> },
 * }}
 */
export const calculateNetIncome = ({
  netIncomeBeforeStudentLoan,
  grossIncome,
  taxRegion,
  studentLoanPlan,
}) => {
  const before = Math.max(0, round2(Number(netIncomeBeforeStudentLoan) || 0));
  const sl = calculateStudentLoanRepayment({ grossIncome, taxRegion, studentLoanPlan });
  const net_income_after_student_loan = Math.max(0, round2(before - sl.student_loan_repayment));

  const trace = {
    inputs: {
      gross_income: Number(grossIncome) || 0,
      student_loan_plan: studentLoanPlan == null || studentLoanPlan === '' ? null : String(studentLoanPlan),
    },
    steps: [
      ...sl.trace.steps,
      {
        id: 4,
        label: 'Net income after student loan',
        detail: 'previous net income (after tax, NI, pension) − student_loan_repayment',
        value: net_income_after_student_loan,
      },
    ],
  };

  return {
    student_loan_plan: sl.student_loan_plan,
    student_loan_repayment: sl.student_loan_repayment,
    repayment_threshold_used: sl.repayment_threshold_used,
    repayable_income: sl.repayable_income,
    net_income_before_student_loan: before,
    net_income_after_student_loan,
    trace,
  };
};

// ----------------------------------------------------------------
// 6. calculateTakeHome
// ----------------------------------------------------------------
/**
 * Estimates net take-home using the correct model for each contribution type:
 *  - Salary sacrifice reduces taxable income → lower IT and NI
 *  - Personal pension is deducted from after-tax take-home
 *
 * @param {number} grossSalary
 * @param {number} employeeSacrificePct
 * @param {number} personalPensionNet
 * @returns {{
 *   estimatedIncomeTax:   number,
 *   estimatedNI:          number,
 *   sacrificeGross:       number,
 *   personalPensionNet:   number,
 *   grossTakeHomeAnnual:  number,   // after sacrifice & deductions, before SIPP payment
 *   grossTakeHomeMonthly: number,
 *   netTakeHomeAnnual:    number,   // after SIPP payment too
 *   netTakeHomeMonthly:   number,
 * }}
 */
export const calculateTakeHome = (grossSalary, employeeSacrificePct, personalPensionNet = 0, taxRegion = 'england') => {
  const salary = Number(grossSalary) || 0;
  const sacPct = Number(employeeSacrificePct) || 0;
  const ppNet  = Number(personalPensionNet) || 0;
  const region = normalizeTaxRegion(taxRegion);

  const sacrificeGross = round2((sacPct / 100) * salary);
  const salaryForTax   = salary - sacrificeGross;

  const [incomeTax, ni] = _incomeTaxAndNI(salaryForTax, region);

  // Gross take-home: salary after sacrifice, minus IT and NI
  const grossTakeHome = round2(salaryForTax - incomeTax - ni);
  // Net take-home: after personal pension net payment
  const netTakeHome   = round2(grossTakeHome - ppNet);

  return {
    estimatedIncomeTax:   incomeTax,
    estimatedNI:          ni,
    sacrificeGross,
    personalPensionNet:   ppNet,
    grossTakeHomeAnnual:  grossTakeHome,
    grossTakeHomeMonthly: round2(grossTakeHome / 12),
    netTakeHomeAnnual:    netTakeHome,
    netTakeHomeMonthly:   round2(netTakeHome / 12),
  };
};

// ----------------------------------------------------------------
// 7. calculateFullPosition  (master function)
// ----------------------------------------------------------------
/**
 * Combines all calculations into a single object for the UI.
 * Tax band uses {@link calculateDynamicTaxBand} so personal pension (net, grossed up) reduces
 * income for band placement alongside salary sacrifice.
 * Components should call only this function and destructure what they need.
 *
 * @param {number} grossSalary
 * @param {number} employeeSacrificePct   % of salary to sacrifice (pre-tax, pre-NI)
 * @param {number} employerPercent        % employer contributes
 * @param {number} personalPensionNet     Net annual £ paid into personal pension / SIPP
 * @param {'england' | 'scotland'} [taxRegion='england']
 * @param {number} [sharePlanContribution=0] Annual £ into company share plan
 * @param {'pre_tax' | 'post_tax'} [sharePlanType='post_tax']
 * @param {string | null} [studentLoanPlan] Scottish Plan 4: {@link STUDENT_LOAN_PLAN_4}; ignored outside Scotland
 * @returns {object}
 */
export const calculateFullPosition = (
  grossSalary,
  employeeSacrificePct,
  employerPercent,
  personalPensionNet = 0,
  taxRegion = 'england',
  sharePlanContribution = 0,
  sharePlanType = SHARE_PLAN_TYPES.POST_TAX,
  studentLoanPlan = null,
) => {
  const salary  = Number(grossSalary) || 0;
  const sacPct  = Number(employeeSacrificePct) || 0;
  const erPct   = Number(employerPercent) || 0;
  const ppNet   = Number(personalPensionNet) || 0;
  const region  = normalizeTaxRegion(taxRegion);

  const sharePlanOpts = {
    sharePlanContribution: Number(sharePlanContribution) || 0,
    sharePlanType: sharePlanType === SHARE_PLAN_TYPES.PRE_TAX || sharePlanType === 'pre_tax'
      ? SHARE_PLAN_TYPES.PRE_TAX
      : SHARE_PLAN_TYPES.POST_TAX,
  };
  const sharePlanDeductionApplied = getSharePlanDeduction(
    sharePlanOpts.sharePlanContribution,
    sharePlanOpts.sharePlanType,
  );

  const sacrificeGross = round2((sacPct / 100) * salary);
  const effectiveSalary = salary - sacrificeGross;

  const pensionBand = calculateDynamicTaxBand(salary, sacrificeGross, ppNet, region, sharePlanOpts);
  const taxBand = pensionBand.tax_band;
  const marginalIncomeTaxRate = pensionBand.marginalIncomeTaxRate;

  const sacrifice      = calculateSacrificeContribution(salary, sacPct, region);
  const personalPension = calculatePersonalPensionCost(salary, sacrificeGross, ppNet, region, sharePlanOpts);
  const allowance      = calculateRemainingAllowance(salary, sacPct, erPct, ppNet);
  const recommendation = calculateRecommendation(sacPct, erPct, salary, ppNet, region, sharePlanOpts);
  const takeHomeBase     = calculateTakeHome(salary, sacPct, ppNet, region);
  const loanPlan =
    studentLoanPlan === STUDENT_LOAN_PLAN_4 || studentLoanPlan === 'plan_4'
      ? STUDENT_LOAN_PLAN_4
      : null;
  const netIncomeAfterLoan = calculateNetIncome({
    netIncomeBeforeStudentLoan: takeHomeBase.netTakeHomeAnnual,
    grossIncome: salary,
    taxRegion: region,
    studentLoanPlan: loanPlan,
  });
  const takeHome = {
    ...takeHomeBase,
    netTakeHomeAfterPensionAnnual: takeHomeBase.netTakeHomeAnnual,
    netTakeHomeAfterPensionMonthly: takeHomeBase.netTakeHomeMonthly,
    studentLoanPlan: netIncomeAfterLoan.student_loan_plan,
    studentLoanRepaymentAnnual: netIncomeAfterLoan.student_loan_repayment,
    repaymentThresholdUsed: netIncomeAfterLoan.repayment_threshold_used,
    studentLoanRepayableIncomeAnnual: netIncomeAfterLoan.repayable_income,
    netTakeHomeAnnual: netIncomeAfterLoan.net_income_after_student_loan,
    netTakeHomeMonthly: round2(netIncomeAfterLoan.net_income_after_student_loan / 12),
    netIncomeTrace: netIncomeAfterLoan.trace,
  };

  // Employer gross for display
  const employerGrossAnnual  = round2((erPct / 100) * salary);
  const employerGrossMonthly = round2(employerGrossAnnual / 12);

  // Combined totals across all employee + employer contributions
  const totalGrossAnnual  = round2(sacrifice.sacrificeGross + personalPension.grossPension + employerGrossAnnual);
  const totalGrossMonthly = round2(totalGrossAnnual / 12);
  const ppGrossPct        = salary > 0
    ? round2((personalPension.grossPension / salary) * 100)
    : 0;
  const totalCombinedPct  = round2(sacPct + erPct + ppGrossPct);

  return {
    // Input echo
    grossSalary:          salary,
    employeeSacrificePct: sacPct,
    employerPercent:      erPct,
    personalPensionNet:   ppNet,
    sharePlanContribution:  sharePlanOpts.sharePlanContribution,
    sharePlanType:          sharePlanOpts.sharePlanType,
    sharePlanDeductionApplied,
    updatedAdjustedIncome:  pensionBand.adjusted_income,

    // Tax band (after sacrifice; personal pension reduces income for band placement)
    taxBand,
    marginalIncomeTaxRate,

    pensionBandImpact: {
      adjustedIncome:           pensionBand.adjusted_income,
      grossPension:             pensionBand.gross_pension,
      incomeBeforePersonalPension: pensionBand.income_before_personal_pension,
      sharePlanDeductionApplied: pensionBand.share_plan_deduction_applied,
      taxBandBeforePersonalPension: pensionBand.tax_band_before_personal_pension,
      marginalRateBeforePersonalPension: pensionBand.marginal_rate_before_personal_pension,
      hasDroppedTaxBand:        pensionBand.has_dropped_tax_band,
      remainingNeeded:          pensionBand.remaining_needed,
      trace:                    pensionBand.trace,
    },

    // Structured contribution objects — passed as whole objects to cards
    sacrifice,
    personalPension,

    // Annual Allowance
    allowance,

    // 15% recommendation
    recommendation,

    // Employer figures (kept at top level for callers / future UI)
    employerGrossAnnual,
    employerGrossMonthly,

    // Combined totals
    totalGrossAnnual,
    totalGrossMonthly,
    totalCombinedPct,

    // Take-home estimates
    takeHome,

    // Meta
    currentYear: TAX_RULES.currentYear,
    taxRegion:    region,
  };
};
