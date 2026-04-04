// ============================================================
// UK TAX RULES 2025/26
// UPDATE THIS FILE EACH APRIL WITH THE NEW YEAR'S FIGURES.
// All values in £ unless otherwise stated.
// All rates as whole-number percentages (e.g. 20 = 20%).
// ============================================================

export const TAX_RULES = {
  currentYear: "2025/26",

  // ----------------------------------------------------------
  // Income Tax — England, Wales & Northern Ireland (2025/26)
  // Personal allowance is frozen at £12,570 until 2027/28.
  // ----------------------------------------------------------
  incomeTax: {
    personalAllowance: 12570,

    bands: [
      { name: "Personal Allowance", min: 0,      max: 12570,   rate: 0  },
      { name: "Basic Rate",         min: 12571,   max: 50270,   rate: 20 },
      { name: "Higher Rate",        min: 50271,   max: 125140,  rate: 40 },
      { name: "Additional Rate",    min: 125141,  max: Infinity, rate: 45 },
    ],

    personalAllowanceTaperStart: 100000,
    personalAllowanceTaperEnd:   125140,

    basicRateBandWidth: 37700, // £12,571–£50,270
  },

  // ----------------------------------------------------------
  // Income Tax — Scotland only (2025/26)
  // Source: gov.scot Scottish Income Tax bands. Rest of UK uses incomeTax above.
  // NI is UK-wide (same Class 1 primary as elsewhere).
  // ----------------------------------------------------------
  incomeTaxScotland: {
    personalAllowance: 12570,

    bands: [
      { name: "Personal Allowance", min: 0,       max: 12570,    rate: 0  },
      { name: "Starter Rate",       min: 12571,   max: 15397,    rate: 19 },
      { name: "Scottish Basic Rate", min: 15398,  max: 27491,    rate: 20 },
      { name: "Intermediate Rate",  min: 27492,   max: 43662,    rate: 21 },
      { name: "Scottish Higher Rate", min: 43663, max: 75000,    rate: 42 },
      { name: "Advanced Rate",      min: 75001,   max: 125140,   rate: 45 },
      { name: "Top Rate",           min: 125141,  max: Infinity, rate: 48 },
    ],

    personalAllowanceTaperStart: 100000,
    personalAllowanceTaperEnd:   125140,
  },

  // ----------------------------------------------------------
  // National Insurance (Class 1 Employee Primary) 2025/26
  // ----------------------------------------------------------
  nationalInsurance: {
    primaryThreshold:   12570,   // No NICs below this
    upperEarningsLimit: 50270,   // 8% above this
    mainRate:           8,       // % on earnings PT→UEL
    upperRate:          2,       // % on earnings above UEL
  },

  // ----------------------------------------------------------
  // Pension
  // ----------------------------------------------------------
  pension: {
    annualAllowance: {
      standard: 60000,     // Max gross pension input per year
      minimum:  10000,     // Minimum after tapering
      // Tapering: reduces £1 per £2 over £260,000 threshold income
      taperThresholdIncome: 260000,
      rule: "Lower of £60,000 or 100% of relevant UK earnings",
    },

    taxRelief: {
      // Relief at source (SIPP / personal pension):
      // User pays 80p, provider claims 20p from HMRC → £1 gross
      reliefAtSourceMultiplier: 0.8, // user pays 80% of gross contribution
      basicRate:      20,  // auto-added for ALL contributors
      higherRate:     40,  // basic (20%) auto + 20% via Self Assessment
      additionalRate: 45,  // basic (20%) auto + 25% via Self Assessment
    },

    employerContributionTaxable: false, // employer contributions not a benefit in kind

    recommendation: {
      minimumTotalPercentage: 15, // employee + employer combined target
    },
  },

  // ----------------------------------------------------------
  // Savings & Dividend Allowances
  // ----------------------------------------------------------
  savings: {
    personalSavingsAllowance: {
      basicRate:      1000,
      higherRate:     500,
      additionalRate: 0,
    },
    startingRateForSavings: 5000, // 0% on first £5,000 savings if non-savings income < £17,570
    startingRate: 0,
  },

  dividends: {
    allowance: 500, // first £500 tax-free for all taxpayers
    basicRate:      8.75,
    higherRate:     33.75,
    additionalRate: 39.35,
  },

  // ----------------------------------------------------------
  // Student loan — Plan 4 (Scotland) repayment via PAYE
  // Threshold and rate: update with HMRC / Student Loans Company guidance each year.
  // Repayments are on income above the threshold; not deductible for income tax.
  // ----------------------------------------------------------
  studentLoan: {
    plan4: {
      threshold: 32745, // £/year — income above this is liable at ratePercent
      ratePercent: 9,
    },
  },

  // ----------------------------------------------------------
  // High Income Child Benefit Charge
  // ----------------------------------------------------------
  childBenefit: {
    taperStart: 60000,  // charge begins above this ANI
    taperEnd:   80000,  // full clawback above this ANI
    chargePercentPerPound: 1, // 1% charge per £200 over threshold = 0.5% per £100
  },

  // ----------------------------------------------------------
  // Previous years — scaffold for carry-forward feature
  // Carry forward: unused annual allowance from last 3 years
  // ----------------------------------------------------------
  previousYears: {
    "2024/25": { annualAllowance: 60000, personalAllowance: 12570 },
    "2023/24": { annualAllowance: 60000, personalAllowance: 12570 },
    "2022/23": { annualAllowance: 40000, personalAllowance: 12570 },
    "2021/22": { annualAllowance: 40000, personalAllowance: 12570 },
  },
};

/** @param {'england' | 'scotland'} taxRegion */
export function getIncomeTaxRules(taxRegion) {
  return taxRegion === 'scotland' ? TAX_RULES.incomeTaxScotland : TAX_RULES.incomeTax;
}

/** Normalise DB / API values */
export function normalizeTaxRegion(value) {
  return value === 'scotland' ? 'scotland' : 'england';
}
