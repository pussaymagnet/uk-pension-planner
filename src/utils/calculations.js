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

import { TAX_RULES } from '../data/taxRules';

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** Round to nearest penny */
const round2 = (n) => Math.round(n * 100) / 100;

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
const _incomeTaxAndNI = (salary) => {
  // Income tax — iterate over bands
  let incomeTax = 0;
  for (const band of TAX_RULES.incomeTax.bands) {
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
export const getTaxBand = (grossSalary) => {
  const { bands } = TAX_RULES.incomeTax;
  for (const band of bands) {
    if (grossSalary >= band.min && grossSalary <= band.max) {
      return band.name;
    }
  }
  return bands[bands.length - 1].name;
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
export const calculateSacrificeContribution = (grossSalary, employeeSacrificePct) => {
  const salary = Number(grossSalary) || 0;
  const pct    = Number(employeeSacrificePct) || 0;

  const sacrificeGross = round2((pct / 100) * salary);
  const salaryReduced  = salary - sacrificeGross;

  const [itFull,    niFull]    = _incomeTaxAndNI(salary);
  const [itReduced, niReduced] = _incomeTaxAndNI(salaryReduced);

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
 * @param {number} effectiveSalary   Salary AFTER any sacrifice (for tax-band calc)
 * @param {number} personalPensionNet  Net annual £ the employee actually pays
 * @returns {{
 *   grossPension:    number,  // gross landed in pension pot (net / 0.8)
 *   netPaid:         number,  // same as input — what leaves the bank
 *   basicRelief:     number,  // 20% top-up from HMRC
 *   saRelief:        number,  // additional relief claimable via SA
 *   saReliefPct:     number,  // 0, 20 or 25
 *   effectiveCost:   number,  // netPaid minus SA reclaim
 *   monthlyNetPaid:  number,
 * }}
 */
export const calculatePersonalPensionCost = (effectiveSalary, personalPensionNet) => {
  const salary  = Number(effectiveSalary) || 0;
  const netPaid = Number(personalPensionNet) || 0;

  const multiplier   = TAX_RULES.pension.taxRelief.reliefAtSourceMultiplier; // 0.8
  const grossPension = round2(netPaid / multiplier);
  const basicRelief  = round2(grossPension - netPaid);

  const taxBand = getTaxBand(salary);
  let saReliefPct = 0;
  if (taxBand === 'Higher Rate')     saReliefPct = TAX_RULES.pension.taxRelief.higherRate;
  if (taxBand === 'Additional Rate') saReliefPct = TAX_RULES.pension.taxRelief.additionalRate;

  const saRelief    = round2((grossPension * saReliefPct) / 100);
  const effectiveCost = round2(netPaid - saRelief);
  const monthlyNetPaid = round2(netPaid / 12);

  return { grossPension, netPaid, basicRelief, saRelief, saReliefPct, effectiveCost, monthlyNetPaid };
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
    warning = `Total contributions (${formatCurrency(usedAllowance)}) exceed 100% of salary — the maximum that qualifies for tax relief.`;
  } else if (isExceeding) {
    const excess = round2(usedAllowance - effectiveMax);
    warning = `You are exceeding the £60,000 Annual Allowance by ${formatCurrency(excess)}. A tax charge will apply on the excess at your marginal rate.`;
  } else if (percentUsed >= 90) {
    warning = `You are using ${percentUsed}% of your Annual Allowance. Consider your carry-forward entitlement before contributing further.`;
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
 * @param {number} employeeSacrificePct
 * @param {number} employerPercent
 * @param {number} grossSalary
 * @param {number} personalPensionNet
 */
export const calculateRecommendation = (
  employeeSacrificePct, employerPercent, grossSalary, personalPensionNet = 0,
) => {
  const sacPct   = Number(employeeSacrificePct) || 0;
  const erPct    = Number(employerPercent) || 0;
  const salary   = Number(grossSalary) || 0;
  const ppNet    = Number(personalPensionNet) || 0;
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

  // Tax band is based on salary after sacrifice
  const sacrificeGross    = round2((sacPct / 100) * salary);
  const effectiveSalary   = salary - sacrificeGross;
  const taxBand           = getTaxBand(effectiveSalary);
  const eligibleForAdditionalRelief =
    taxBand === 'Higher Rate' || taxBand === 'Additional Rate';

  let additionalReliefPercent = 0;
  if (taxBand === 'Higher Rate')     additionalReliefPercent = 20;
  if (taxBand === 'Additional Rate') additionalReliefPercent = 25;

  // SA relief available on employee's existing gross pension contributions
  const totalEmployeeGross = round2(sacrificeGross + ppGrossAnnual);
  const additionalReliefAnnual = round2(
    (totalEmployeeGross * additionalReliefPercent) / 100,
  );

  let message = '';
  if (!salary) {
    message = 'Enter your salary to see personalised recommendations.';
  } else if (meetsTarget) {
    message = `Great — your combined contribution of ${currentTotal}% meets the ${target}% target.`;
  } else {
    message = `To reach the ${target}% target, increase your contributions by approximately ${formatCurrency(monthlyNetNeeded)} per month (net).`;
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
export const calculateTakeHome = (grossSalary, employeeSacrificePct, personalPensionNet = 0) => {
  const salary = Number(grossSalary) || 0;
  const sacPct = Number(employeeSacrificePct) || 0;
  const ppNet  = Number(personalPensionNet) || 0;

  const sacrificeGross = round2((sacPct / 100) * salary);
  const salaryForTax   = salary - sacrificeGross;

  const [incomeTax, ni] = _incomeTaxAndNI(salaryForTax);

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
// 7. calculatePensionValue
// ----------------------------------------------------------------
/**
 * Shows the full monetary value of each contribution type — what each
 * £ of sacrifice or net pension payment actually delivers.
 *
 * @param {number} grossSalary
 * @param {number} employeeSacrificePct
 * @param {number} employerPercent
 * @param {number} personalPensionNet
 */
export const calculatePensionValue = (
  grossSalary, employeeSacrificePct, employerPercent, personalPensionNet = 0,
) => {
  const salary = Number(grossSalary) || 0;
  const sacPct = Number(employeeSacrificePct) || 0;
  const erPct  = Number(employerPercent) || 0;
  const ppNet  = Number(personalPensionNet) || 0;

  // Effective salary after sacrifice (used for tax-band determination)
  const sacrificeGross  = round2((sacPct / 100) * salary);
  const effectiveSalary = salary - sacrificeGross;
  const taxBand         = getTaxBand(effectiveSalary);

  // --- Salary sacrifice ---
  const [itFull,    niFull]    = _incomeTaxAndNI(salary);
  const [itReduced, niReduced] = _incomeTaxAndNI(effectiveSalary);
  const sacIncomeTaxSaving = round2(itFull - itReduced);
  const sacNiSaving        = round2(niFull - niReduced);
  const sacTotalSaving     = round2(sacIncomeTaxSaving + sacNiSaving);
  const sacNetCost         = round2(sacrificeGross - sacTotalSaving);
  const sacPotPerPound     = sacNetCost > 0
    ? round2((sacrificeGross / sacNetCost) * 100) / 100
    : null;

  // --- Personal pension (relief at source) ---
  const multiplier   = TAX_RULES.pension.taxRelief.reliefAtSourceMultiplier;
  const ppGross      = round2(ppNet / multiplier);
  const ppBasicRelief = round2(ppGross - ppNet);

  let ppSaReliefPct = 0;
  if (taxBand === 'Higher Rate')     ppSaReliefPct = TAX_RULES.pension.taxRelief.higherRate;
  if (taxBand === 'Additional Rate') ppSaReliefPct = TAX_RULES.pension.taxRelief.additionalRate;

  const ppSaRelief      = round2((ppGross * ppSaReliefPct) / 100);
  const ppEffectiveCost = round2(ppNet - ppSaRelief);
  const ppPotPerPound   = ppEffectiveCost > 0
    ? round2((ppGross / ppEffectiveCost) * 100) / 100
    : null;

  // --- Employer ---
  const employerGross = round2((erPct / 100) * salary);

  // Total "free money" = all tax/NI savings + HMRC top-ups + employer contribution
  const totalBonus = round2(sacTotalSaving + ppBasicRelief + ppSaRelief + employerGross);

  return {
    // Sacrifice section
    sacrificeGross,
    sacIncomeTaxSaving,
    sacNiSaving,
    sacTotalSaving,
    sacNetCost,
    sacPotPerPound,
    // Personal pension section
    ppGross,
    ppNet,
    ppBasicRelief,
    ppSaRelief,
    ppSaReliefPct,
    ppEffectiveCost,
    ppPotPerPound,
    // Employer
    employerGross,
    // Combined
    totalBonus,
    taxBand,
  };
};

// ----------------------------------------------------------------
// 8. calculateFullPosition  (master function)
// ----------------------------------------------------------------
/**
 * Combines all calculations into a single object for the UI.
 * Components should call only this function and destructure what they need.
 *
 * @param {number} grossSalary
 * @param {number} employeeSacrificePct   % of salary to sacrifice (pre-tax, pre-NI)
 * @param {number} employerPercent        % employer contributes
 * @param {number} personalPensionNet     Net annual £ paid into personal pension / SIPP
 * @returns {object}
 */
export const calculateFullPosition = (
  grossSalary,
  employeeSacrificePct,
  employerPercent,
  personalPensionNet = 0,
) => {
  const salary  = Number(grossSalary) || 0;
  const sacPct  = Number(employeeSacrificePct) || 0;
  const erPct   = Number(employerPercent) || 0;
  const ppNet   = Number(personalPensionNet) || 0;

  // Effective salary for tax-band purposes
  const sacrificeGross  = round2((sacPct / 100) * salary);
  const effectiveSalary = salary - sacrificeGross;
  const taxBand         = getTaxBand(effectiveSalary);

  const sacrifice      = calculateSacrificeContribution(salary, sacPct);
  const personalPension = calculatePersonalPensionCost(effectiveSalary, ppNet);
  const allowance      = calculateRemainingAllowance(salary, sacPct, erPct, ppNet);
  const recommendation = calculateRecommendation(sacPct, erPct, salary, ppNet);
  const takeHome       = calculateTakeHome(salary, sacPct, ppNet);
  const pensionValue   = calculatePensionValue(salary, sacPct, erPct, ppNet);

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

    // Tax band (based on effective salary after sacrifice)
    taxBand,

    // Structured contribution objects — passed as whole objects to cards
    sacrifice,
    personalPension,

    // Annual Allowance
    allowance,

    // 15% recommendation
    recommendation,

    // Employer figures (kept at top level for ContributionsCard)
    employerGrossAnnual,
    employerGrossMonthly,

    // Combined totals
    totalGrossAnnual,
    totalGrossMonthly,
    totalCombinedPct,

    // Take-home estimates
    takeHome,

    // Pension value / free money breakdown
    pensionValue,

    // Meta
    currentYear: TAX_RULES.currentYear,
  };
};
