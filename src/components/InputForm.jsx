/**
 * InputForm — controlled inputs for all financial details.
 *
 * Contribution types modelled:
 *  - Salary sacrifice (employee + employer): before income tax and NI.
 *    Mode toggle lets user enter these as % of salary or flat £ per year.
 *  - Personal pension (SIPP / relief at source): always entered as the
 *    net annual £ amount the employee physically pays; HMRC adds 20%.
 *
 * displayPeriod (annual | monthly) matches ContributionsCard: stored values
 * remain annual; in monthly mode £ fields show/edit monthly equivalents.
 */

const r2 = (n) => Math.round(n * 100) / 100;

/** Fields stored as annual £ in app state but shown as monthly £ when isMonthly */
function usesCurrencyPeriod(field, contributionMode) {
  if (field === 'grossSalary' || field === 'personalPensionNet' || field === 'sharePlanContribution') return true;
  if (contributionMode === 'nominal' && (field === 'employeeValue' || field === 'employerValue')) {
    return true;
  }
  return false;
}

function annualToDisplay(annualStr, field, isMonthly, contributionMode) {
  if (!usesCurrencyPeriod(field, contributionMode)) return annualStr;
  if (!isMonthly) return annualStr;
  if (annualStr === '' || annualStr === undefined) return '';
  const a = Number(annualStr);
  if (isNaN(a)) return annualStr;
  return String(r2(a / 12));
}

function fromDisplay(field, raw, isMonthly, contributionMode) {
  if (!usesCurrencyPeriod(field, contributionMode)) return raw;
  if (!isMonthly) return raw;
  if (raw === '') return '';
  const m = Number(raw);
  if (isNaN(m)) return raw;
  return String(r2(m * 12));
}

const InputField = ({ label, hint, prefix, suffix, value, onChange, min = 0, max, step = 1 }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {label}
      {hint && <span className="ml-1 text-slate-400 font-normal text-xs">({hint})</span>}
    </label>
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-3 text-slate-500 text-sm font-medium select-none">{prefix}</span>
      )}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full rounded-lg border border-slate-300 bg-white py-2.5 text-sm text-slate-900
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors
          ${prefix ? 'pl-7 pr-3' : suffix ? 'pl-3 pr-8' : 'px-3'}
        `}
        placeholder="0"
      />
      {suffix && (
        <span className="absolute right-3 text-slate-500 text-sm font-medium select-none">{suffix}</span>
      )}
    </div>
  </div>
);

const ModeToggle = ({ contributionMode, onModeToggle }) => (
  <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 gap-0.5">
    {[
      { id: 'percent', label: '% of salary' },
      { id: 'nominal', label: '£ amount'    },
    ].map(({ id, label }) => (
      <button
        key={id}
        type="button"
        onClick={() => onModeToggle(id)}
        className={`px-3 py-1 rounded-md text-xs font-medium transition-all
          ${contributionMode === id
            ? 'bg-white shadow-sm text-slate-900'
            : 'text-slate-500 hover:text-slate-700'}`}
      >
        {label}
      </button>
    ))}
  </div>
);

export default function InputForm({
  values,
  onChange,
  contributionMode,
  onModeToggle,
  displayPeriod = 'annual',
  taxRegion = 'england',
}) {
  const isMonthly = displayPeriod === 'monthly';

  const handleFieldChange = (field) => (val) => {
    onChange(field, fromDisplay(field, val, isMonthly, contributionMode));
  };

  // Salary sacrifice fields (employee + employer) follow the mode toggle
  const isPercent = contributionMode === 'percent';
  const sacrificeProps = isPercent
    ? { suffix: '%', prefix: undefined, max: 100, step: 0.5, hint: '% of salary — before tax & NI' }
    : {
        prefix: '£',
        suffix: undefined,
        max: isMonthly ? Math.ceil(10000000 / 12) : 10000000,
        step: isMonthly ? 50 : 100,
        hint: isMonthly
          ? 'monthly gross £ — before tax & NI'
          : 'annual gross £ — before tax & NI',
      };

  const grossLabel = isMonthly ? 'Gross Monthly Salary' : 'Gross Annual Salary';
  const grossHint = isMonthly ? 'before tax, per month' : 'before tax';
  const grossMax = isMonthly ? Math.ceil(10000000 / 12) : 10000000;
  const grossStep = isMonthly ? 100 : 1000;

  const personalHint = isMonthly
    ? 'net monthly £ you pay — HMRC adds 20%'
    : 'net annual £ you pay — HMRC adds 20%';
  const personalMax = isMonthly ? Math.ceil(10000000 / 12) : 10000000;
  const personalStep = isMonthly ? 50 : 100;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-slate-900">Your Details</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 whitespace-nowrap">Salary sacrifice in</span>
          <ModeToggle contributionMode={contributionMode} onModeToggle={onModeToggle} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Gross salary */}
        <InputField
          label={grossLabel}
          hint={grossHint}
          prefix="£"
          value={annualToDisplay(values.grossSalary, 'grossSalary', isMonthly, contributionMode)}
          onChange={handleFieldChange('grossSalary')}
          min={0}
          max={grossMax}
          step={grossStep}
        />

        {/* Salary sacrifice — employee */}
        <InputField
          label="Your Salary Sacrifice"
          hint={sacrificeProps.hint}
          prefix={sacrificeProps.prefix}
          suffix={sacrificeProps.suffix}
          value={annualToDisplay(values.employeeValue, 'employeeValue', isMonthly, contributionMode)}
          onChange={handleFieldChange('employeeValue')}
          min={0}
          max={sacrificeProps.max}
          step={sacrificeProps.step}
        />

        {/* Salary sacrifice — employer match */}
        <InputField
          label="Employer Pension Contribution"
          hint={sacrificeProps.hint}
          prefix={sacrificeProps.prefix}
          suffix={sacrificeProps.suffix}
          value={annualToDisplay(values.employerValue, 'employerValue', isMonthly, contributionMode)}
          onChange={handleFieldChange('employerValue')}
          min={0}
          max={sacrificeProps.max}
          step={sacrificeProps.step}
        />

        {/* Personal pension (SIPP) — always net £ */}
        <InputField
          label="Personal Pension Contribution"
          hint={personalHint}
          prefix="£"
          value={annualToDisplay(values.personalPensionNet, 'personalPensionNet', isMonthly, contributionMode)}
          onChange={handleFieldChange('personalPensionNet')}
          min={0}
          max={personalMax}
          step={personalStep}
        />

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Share plan (company shares / SIP)
            <span className="ml-1 text-slate-400 font-normal text-xs">
              (annual £ invested — pre-tax reduces taxable income; post-tax does not)
            </span>
          </label>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium select-none">
                £
              </span>
              <input
                type="number"
                min={0}
                max={personalMax}
                step={personalStep}
                value={annualToDisplay(
                  values.sharePlanContribution,
                  'sharePlanContribution',
                  isMonthly,
                  contributionMode,
                )}
                onChange={(e) => handleFieldChange('sharePlanContribution')(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-7 pr-3 text-sm text-slate-900
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="0"
              />
            </div>
            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 gap-0.5 shrink-0">
              {[
                { id: 'post_tax', label: 'Post-tax' },
                { id: 'pre_tax', label: 'Pre-tax' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChange('sharePlanType', id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${(values.sharePlanType || 'post_tax') === id
                      ? 'bg-white shadow-sm text-slate-900'
                      : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {taxRegion === 'scotland' && (
          <div className="sm:col-span-2 pt-2 border-t border-slate-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={values.studentLoanPlan === 'plan_4'}
                onChange={(e) => onChange('studentLoanPlan', e.target.checked ? 'plan_4' : '')}
                className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="block text-sm font-medium text-slate-700">
                  Student Loan Plan 4 (Scotland)
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Repayment is calculated on gross income above the Plan 4 threshold and deducted from
                  take-home after tax — it does not reduce taxable income.
                </span>
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
