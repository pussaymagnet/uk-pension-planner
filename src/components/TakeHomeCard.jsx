/**
 * TakeHomeCard
 *
 * Displays estimated net take-home pay before and after all pension
 * deductions for the selected display period (annual / monthly).
 *
 * With salary sacrifice the income tax and NI are already reduced
 * (sacrifice lowers taxable income), so the "after sacrifice & tax"
 * figure already reflects the sacrifice benefit.
 *
 * Props:
 *  takeHome      — from calculateFullPosition
 *  displayPeriod — 'annual' | 'monthly'
 */

const fmt = (value) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);

const r2 = (n) => Math.round(n * 100) / 100;

const Row = ({ label, value, highlight }) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-sm text-slate-600">{label}</span>
    <span className={`text-sm font-semibold ${highlight ? 'text-slate-900' : 'text-slate-700'}`}>
      {fmt(value)}
    </span>
  </div>
);

export default function TakeHomeCard({ takeHome, displayPeriod = 'annual' }) {
  if (!takeHome) return null;

  const {
    grossTakeHomeMonthly,
    grossTakeHomeAnnual,
    netTakeHomeMonthly,
    netTakeHomeAnnual,
    netTakeHomeAfterPensionAnnual,
    netTakeHomeAfterPensionMonthly,
    estimatedIncomeTax,
    estimatedNI,
    sacrificeGross,
    personalPensionNet,
    studentLoanRepaymentAnnual = 0,
  } = takeHome;

  const hasStudentLoan = studentLoanRepaymentAnnual > 0;

  const isMonthly = displayPeriod === 'monthly';
  const periodLabel = isMonthly ? '/month' : '/year';

  /** After tax, NI, and net pension; before Plan 4 student loan (if enriched by calculateFullPosition). */
  const afterPensionBeforeLoan = isMonthly
    ? (netTakeHomeAfterPensionMonthly ?? netTakeHomeMonthly)
    : (netTakeHomeAfterPensionAnnual ?? netTakeHomeAnnual);

  /** Final take-home (after pension and any student loan repayment). */
  const afterAll = isMonthly ? netTakeHomeMonthly : netTakeHomeAnnual;

  // Show either the monthly or annual figure for each headline
  const beforePension = isMonthly ? grossTakeHomeMonthly : grossTakeHomeAnnual;

  const hasSacrifice       = sacrificeGross > 0;
  const hasPersonalPension = personalPensionNet > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Estimated Take-Home Pay</h2>

      {/* Before / After columns */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* After sacrifice & tax */}
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
            After Tax &amp; Sacrifice
          </p>
          <p className="text-2xl font-bold text-slate-900">{fmt(beforePension)}</p>
          <p className="text-xs text-slate-500 mt-0.5">{periodLabel}</p>
        </div>

        {/* After pension and optional student loan (final take-home) */}
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-3">
            {hasStudentLoan ? 'After Pension & Student Loan' : 'After All Pension'}
          </p>
          <p className="text-2xl font-bold text-blue-700">{fmt(hasStudentLoan ? afterAll : afterPensionBeforeLoan)}</p>
          <p className="text-xs text-blue-500 mt-0.5">{periodLabel}</p>
          {hasStudentLoan && (
            <p className="text-[11px] text-blue-600/80 mt-2 leading-snug">
              After pension (before loan): {fmt(afterPensionBeforeLoan)}
              {periodLabel}
            </p>
          )}
        </div>
      </div>

      {/* Deductions breakdown */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Annual Deductions from Gross Salary
        </p>
        <Row label="Income Tax (estimated, on taxable income)" value={isMonthly ? r2(estimatedIncomeTax / 12) : estimatedIncomeTax} />
        <Row label="National Insurance (estimated)"            value={isMonthly ? r2(estimatedNI / 12) : estimatedNI} />
        {hasSacrifice && (
          <Row label="Salary sacrifice (gross — reduces taxable pay)" value={isMonthly ? r2(sacrificeGross / 12) : sacrificeGross} highlight />
        )}
        {hasPersonalPension && (
          <Row label="Personal pension (net — paid from take-home)"   value={isMonthly ? r2(personalPensionNet / 12) : personalPensionNet} highlight />
        )}
        {hasStudentLoan && (
          <Row
            label="Student loan Plan 4 (from gross above threshold — post-tax deduction)"
            value={isMonthly ? r2(studentLoanRepaymentAnnual / 12) : studentLoanRepaymentAnnual}
            highlight
          />
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-slate-400 mt-4 leading-relaxed">
        Estimates use standard England &amp; Wales income tax rates and Class&nbsp;1 primary NI.
        Salary sacrifice reduces taxable income, so both IT and NI are lower.
        Salaries above £100,000 may differ due to the personal allowance taper.
      </p>
    </div>
  );
}
