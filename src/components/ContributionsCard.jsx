/**
 * ContributionsCard — breakdown of what goes into the pension and the
 * real net cost to the employee for each contribution type.
 *
 * Props:
 *  sacrifice        — from calculateSacrificeContribution
 *  personalPension  — from calculatePersonalPensionCost
 *  employer / total — from calculateFullPosition
 *  displayPeriod    — 'annual' | 'monthly'
 *  grossSalary      — annual gross (for pre-higher-rate guide)
 *  salarySacrificeGross — annual £ sacrificed (for adjusted income in guide)
 *  taxRegion        — 'england' | 'scotland'
 *  personalPensionNet — net annual £ (for remaining-needed vs guide)
 *  remainingPensionNeeded — from pensionBandImpact.remainingNeeded
 */
import { formatCurrency, calculateAdjustedIncomeAndPension } from '../utils/calculations';

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

/** Short reason when calculateSelfAssessmentRelief returns £0 extra relief. */
function selfAssessmentZeroNote(sa) {
  if (!sa || sa.self_assessment_relief > 0) return null;
  if (!sa.eligible) {
    return 'No extra relief on this basis: your marginal income tax rate on salary (after sacrifice, before personal pension) is 20% or less, so there is nothing above basic rate to reclaim via Self Assessment.';
  }
  if (sa.higher_band_portion <= 0) {
    return 'No eligible slice: none of your gross pension can sit against income above the pre–higher-rate threshold — your income after sacrifice (before pension) is fully on or below that line.';
  }
  return null;
}

/** Net SIPP/personal pension (relief at source) to sit just below the higher-rate threshold. */
function PersonalPensionPreHigherGuide({
  grossSalary,
  salarySacrificeGross,
  taxRegion,
  displayPeriod,
  personalPensionNet = 0,
  remainingPensionNeeded = 0,
  sharePlanDeductionApplied = 0,
}) {
  const isMonthly = displayPeriod === 'monthly';
  const guide = calculateAdjustedIncomeAndPension(
    grossSalary,
    salarySacrificeGross,
    taxRegion,
    sharePlanDeductionApplied,
  );
  const net = guide.required_net_pension_contribution;
  const v = (annual) => formatCurrency(isMonthly ? r2(annual / 12) : annual);
  const regionLabel =
    taxRegion === 'scotland' ? 'Scotland' : 'England, Wales & Northern Ireland';
  const ppNet = Number(personalPensionNet) || 0;

  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3 mt-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
        Personal pension — higher-rate threshold guide
      </p>
      <p className="text-xs text-slate-500 mb-2">
        Uses adjusted income (salary minus salary sacrifice
        {sharePlanDeductionApplied > 0 ? ', minus pre-tax share plan' : ''}) and your tax region (
        {regionLabel}).
        Net figures assume relief at source (you pay 80% of the gross extension; HMRC adds 20%).
        The tax band above updates as you enter your net pension (grossed up for income).
      </p>
      {net > 0 ? (
        <div className="text-sm text-slate-800 leading-snug space-y-2">
          {remainingPensionNeeded > 0 ? (
            <p>
              To stay just below the higher-rate band, about{' '}
              <span className="font-semibold tabular-nums text-slate-900">{v(remainingPensionNeeded)}</span> net{' '}
              {isMonthly ? 'per month' : 'per year'} still to go
              {ppNet > 0 ? ' after your current pension contribution' : ''}
              {' '}(full suggested net from salary only: {v(net)}).
            </p>
          ) : (
            <p className="text-slate-700">
              Your current net pension meets or exceeds the amount suggested to sit just below the
              higher-rate band (suggested total was {v(net)} net {isMonthly ? 'per month' : 'per year'}).
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-600 leading-snug">
          Your adjusted income is already at or below the higher-rate threshold for this region —
          no extra net contribution is suggested on this basis.
        </p>
      )}
    </div>
  );
}

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
  grossSalary = 0,
  salarySacrificeGross = 0,
  taxRegion = 'england',
  personalPensionNet = 0,
  remainingPensionNeeded = 0,
  sharePlanDeductionApplied = 0,
}) {
  const isMonthly = displayPeriod === 'monthly';
  const v = (annual) => formatCurrency(isMonthly ? r2(annual / 12) : annual);
  const periodSuffix = isMonthly ? '/month' : '/year';

  const hasSacrifice       = sacrifice?.sacrificeGross > 0;
  const hasPersonalPension = personalPension?.grossPension > 0;
  const hasEmployer        = employerGrossAnnual > 0;
  const hasData            = hasSacrifice || hasPersonalPension || hasEmployer;
  const hasSalary          = Number(grossSalary) > 0;
  const showBody             = hasData || hasSalary;
  const saZeroNote =
    hasPersonalPension ? selfAssessmentZeroNote(personalPension.selfAssessment) : null;

  const guideProps = {
    grossSalary,
    salarySacrificeGross,
    taxRegion,
    displayPeriod,
    personalPensionNet,
    remainingPensionNeeded,
    sharePlanDeductionApplied,
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-2">Current Contributions</h2>

      {!showBody ? (
        <p className="text-sm text-slate-400 italic mt-2">
          Enter your salary and contribution details above.
        </p>
      ) : (
        <div>
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
              <Row
                label={`Self Assessment — extra relief claimable (${periodSuffix})`}
                value={v(personalPension.saRelief ?? 0)}
                indent
                positive={personalPension.saRelief > 0}
              />
              {personalPension.saRelief > 0 && (
                <p className="text-xs text-slate-500 pl-4 -mt-1 mb-1">
                  Averages about {personalPension.saReliefExtraPct ?? personalPension.saReliefPct}% of gross
                  pension; claim via your tax return (HMRC adds 20% at source already).
                </p>
              )}
              {saZeroNote && (
                <p className="text-xs text-slate-500 pl-4 -mt-1 mb-1 max-w-prose">{saZeroNote}</p>
              )}
              {hasSalary && (
                <PersonalPensionPreHigherGuide {...guideProps} />
              )}
            </>
          )}

          {hasSalary && !hasPersonalPension && (
            <>
              {(hasSacrifice || hasEmployer) && <Divider />}
              <PersonalPensionPreHigherGuide {...guideProps} />
            </>
          )}

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

          {(hasData || hasSalary) && (
            <>
              <Divider />
              <SectionHeading>Combined Total</SectionHeading>
              <Row
                label={`Total gross into pension (${totalCombinedPct}% of salary)`}
                value={isMonthly ? formatCurrency(totalGrossMonthly) : formatCurrency(totalGrossAnnual)}
                highlight
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
