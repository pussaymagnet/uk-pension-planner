/**
 * ContributionsCard — breakdown of what goes into the pension and the
 * real net cost to the employee for each contribution type.
 *
 * Props:
 *  sacrifice        — from calculateSacrificeContribution
 *  personalPension  — from calculatePersonalPensionCost
 *  employer / total — from calculateFullPosition
 *  displayPeriod    — 'annual' | 'monthly'
 */
import { formatCurrency } from '../utils/calculations';

const r2 = (n) => Math.round(n * 100) / 100;

const Row = ({ label, value, highlight = false, indent = false, positive = false }) => (
  <div className={`flex justify-between items-center py-2 ${indent ? 'pl-4 border-l-2 border-slate-100' : ''}`}>
    <span className={`text-sm ${highlight ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
      {label}
    </span>
    <span className={`text-sm font-semibold tabular-nums
      ${highlight ? 'text-slate-900 text-base' : positive ? 'text-green-700' : 'text-slate-800'}`}>
      {value}
    </span>
  </div>
);

const SectionHeading = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 mt-3">
    {children}
  </p>
);

const Divider = () => <div className="border-t border-slate-100 my-1" />;

export default function ContributionsCard({
  sacrifice,
  personalPension,
  employerGrossAnnual,
  employerGrossMonthly,
  totalGrossAnnual,
  totalGrossMonthly,
  totalCombinedPct,
  employeeSacrificePct,
  employerPercent,
  displayPeriod = 'annual',
}) {
  const isMonthly = displayPeriod === 'monthly';
  // Pick annual or monthly value; for values that only exist annually, divide by 12
  const v = (annual) => formatCurrency(isMonthly ? r2(annual / 12) : annual);
  const periodSuffix = isMonthly ? '/month' : '/year';

  const hasSacrifice       = sacrifice?.sacrificeGross > 0;
  const hasPersonalPension = personalPension?.grossPension > 0;
  const hasEmployer        = employerGrossAnnual > 0;
  const hasData            = hasSacrifice || hasPersonalPension || hasEmployer;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-2">Current Contributions</h2>

      {!hasData ? (
        <p className="text-sm text-slate-400 italic mt-2">
          Enter your salary and contribution details above.
        </p>
      ) : (
        <div>
          {/* ── Salary sacrifice (employee) ── */}
          {hasSacrifice && (
            <>
              <SectionHeading>Your Salary Sacrifice ({employeeSacrificePct}%)</SectionHeading>
              <Row label={`Gross sacrifice (${periodSuffix})`} value={v(sacrifice.sacrificeGross)} />
              <Row
                label="Income tax saving"
                value={`- ${v(sacrifice.incomeTaxSaving)}`}
                indent
                positive
              />
              <Row
                label="NI saving"
                value={`- ${v(sacrifice.niSaving)}`}
                indent
                positive
              />
              <Row label={`Net cost to you (${periodSuffix})`} value={v(sacrifice.netCostAnnual)} highlight />
            </>
          )}

          {/* ── Personal pension (SIPP / relief at source) ── */}
          {hasPersonalPension && (
            <>
              {hasSacrifice && <Divider />}
              <SectionHeading>Personal Pension — Relief at Source</SectionHeading>
              <Row label={`Gross into pension (${periodSuffix})`} value={v(personalPension.grossPension)} />
              <Row
                label="HMRC basic-rate top-up (+20%)"
                value={`+ ${v(personalPension.basicRelief)}`}
                indent
                positive
              />
              <Row label={`Net you pay (${periodSuffix})`} value={v(personalPension.netPaid)} highlight />
              {personalPension.saRelief > 0 && (
                <Row
                  label={`Higher-rate relief via SA (${personalPension.saReliefPct}%)`}
                  value={`- ${v(personalPension.saRelief)}`}
                  indent
                  positive
                />
              )}
            </>
          )}

          {/* ── Employer ── */}
          {hasEmployer && (
            <>
              <Divider />
              <SectionHeading>Employer Contribution ({employerPercent}%)</SectionHeading>
              <Row
                label={`Employer gross (${periodSuffix})`}
                value={isMonthly ? formatCurrency(employerGrossMonthly) : formatCurrency(employerGrossAnnual)}
              />
            </>
          )}

          {/* ── Combined totals ── */}
          <Divider />
          <SectionHeading>Combined Total</SectionHeading>
          <Row
            label={`Total gross into pension (${totalCombinedPct}% of salary)`}
            value={isMonthly ? formatCurrency(totalGrossMonthly) : formatCurrency(totalGrossAnnual)}
            highlight
          />
        </div>
      )}
    </div>
  );
}
