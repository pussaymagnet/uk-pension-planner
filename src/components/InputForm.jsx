import { formatCurrency } from '../utils/calculations';
import { getFieldLabel, getLabel, periodSlashSuffix, withDisplayPeriodLabel } from '../utils/fieldLabels';

/**
 * InputForm — controlled inputs for all financial details.
 *
 * displayPeriod (annual | monthly): stored values annual; monthly mode shows monthly £.
 */

const r2 = (n) => Math.round(n * 100) / 100;

/** Fields stored as annual £ in app state but shown as monthly £ when isMonthly */
function usesCurrencyPeriod(field, contributionMode) {
  if (
    field === 'grossSalary'
    || field === 'bonusIncome'
    || field === 'benefitInKindTaxable'
    || field === 'personalPensionNet'
    || field === 'sharePlanContribution'
  ) {
    return true;
  }
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

const InputField = ({
  label,
  prefix,
  suffix,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
}) => (
  <div>
    <div className="flex items-start justify-between gap-2 mb-0.5">
      <label className="text-sm font-semibold text-slate-800 flex-1 min-w-0">{label}</label>
    </div>
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
          w-full rounded-lg border border-slate-300 bg-white py-2 min-h-[2.5rem] text-base text-slate-900
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
      { id: 'percent', labelKey: 'contribution_mode_percent' },
      { id: 'nominal', labelKey: 'contribution_mode_nominal' },
    ].map(({ id, labelKey }) => (
      <button
        key={id}
        type="button"
        onClick={() => onModeToggle(id)}
        className={`px-3 py-1 rounded-md text-xs font-medium transition-all
          ${contributionMode === id
            ? 'bg-white shadow-sm text-slate-900'
            : 'text-slate-500 hover:text-slate-700'}`}
      >
        {getLabel(labelKey)}
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
  grossSalary = 0,
  remainingPensionNeeded = 0,
}) {
  const isMonthly = displayPeriod === 'monthly';

  const showHigherBandHint =
    Number(grossSalary) > 0 && Number(remainingPensionNeeded) > 0;
  const hintDisplayAmount = showHigherBandHint
    ? formatCurrency(isMonthly ? r2(remainingPensionNeeded / 12) : remainingPensionNeeded)
    : '';

  const handleFieldChange = (field) => (val) => {
    onChange(field, fromDisplay(field, val, isMonthly, contributionMode));
  };

  const isPercent = contributionMode === 'percent';
  const sacrificeProps = isPercent
    ? { suffix: '%', prefix: undefined, max: 100, step: 0.5 }
    : {
        prefix: '£',
        suffix: undefined,
        max: isMonthly ? Math.ceil(10000000 / 12) : 10000000,
        step: isMonthly ? 50 : 100,
      };

  const grossMax = isMonthly ? Math.ceil(10000000 / 12) : 10000000;
  const grossStep = isMonthly ? 100 : 1000;

  const personalMax = isMonthly ? Math.ceil(10000000 / 12) : 10000000;
  const personalStep = isMonthly ? 50 : 100;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
        <h2 className="text-base font-semibold text-slate-900">
          {withDisplayPeriodLabel(getLabel('pension_inputs'), displayPeriod)}
        </h2>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 whitespace-nowrap">{getLabel('contribution_mode')}</span>
          </div>
          <ModeToggle contributionMode={contributionMode} onModeToggle={onModeToggle} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputField
          label={getFieldLabel('grossSalary')}
          prefix="£"
          value={annualToDisplay(values.grossSalary, 'grossSalary', isMonthly, contributionMode)}
          onChange={handleFieldChange('grossSalary')}
          min={0}
          max={grossMax}
          step={grossStep}
        />

        <InputField
          label={getFieldLabel('bonusIncome')}
          prefix="£"
          value={annualToDisplay(values.bonusIncome ?? '', 'bonusIncome', isMonthly, contributionMode)}
          onChange={handleFieldChange('bonusIncome')}
          min={0}
          max={grossMax}
          step={grossStep}
        />

        <InputField
          label={getFieldLabel('benefitInKindTaxable')}
          prefix="£"
          value={annualToDisplay(
            values.benefitInKindTaxable ?? '',
            'benefitInKindTaxable',
            isMonthly,
            contributionMode,
          )}
          onChange={handleFieldChange('benefitInKindTaxable')}
          min={0}
          max={grossMax}
          step={grossStep}
        />

        <InputField
          label={getFieldLabel('employeeValue')}
          prefix={sacrificeProps.prefix}
          suffix={sacrificeProps.suffix}
          value={annualToDisplay(values.employeeValue, 'employeeValue', isMonthly, contributionMode)}
          onChange={handleFieldChange('employeeValue')}
          min={0}
          max={sacrificeProps.max}
          step={sacrificeProps.step}
        />

        <InputField
          label={getFieldLabel('employerValue')}
          prefix={sacrificeProps.prefix}
          suffix={sacrificeProps.suffix}
          value={annualToDisplay(values.employerValue, 'employerValue', isMonthly, contributionMode)}
          onChange={handleFieldChange('employerValue')}
          min={0}
          max={sacrificeProps.max}
          step={sacrificeProps.step}
        />

        <InputField
          label={getFieldLabel('personalPensionNet')}
          prefix="£"
          value={annualToDisplay(values.personalPensionNet, 'personalPensionNet', isMonthly, contributionMode)}
          onChange={handleFieldChange('personalPensionNet')}
          min={0}
          max={personalMax}
          step={personalStep}
        />

        <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <div className="space-y-2 min-w-0">
            <InputField
              label={getFieldLabel('sharePlanContribution')}
              prefix="£"
              value={annualToDisplay(
                values.sharePlanContribution,
                'sharePlanContribution',
                isMonthly,
                contributionMode,
              )}
              onChange={handleFieldChange('sharePlanContribution')}
              min={0}
              max={personalMax}
              step={personalStep}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">{getLabel('share_plan_type')}</span>
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 gap-0.5 shrink-0">
                {[
                  { id: 'post_tax', labelKey: 'share_plan_type_post_tax' },
                  { id: 'pre_tax', labelKey: 'share_plan_type_pre_tax' },
                ].map(({ id, labelKey }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onChange('sharePlanType', id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all
                      ${(values.sharePlanType || 'post_tax') === id
                        ? 'bg-white shadow-sm text-slate-900'
                        : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {getLabel(labelKey)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {showHigherBandHint && (
            <div
              className="rounded-lg border border-slate-200 bg-slate-50/80 text-slate-800 px-3 py-2.5 text-sm sm:mt-0"
              role="status"
            >
              <span className="text-slate-600">{getLabel('remaining_needed')}</span>{' '}
              <span className="tabular-nums font-semibold text-blue-800">{hintDisplayAmount}</span>{' '}
              <span className="text-slate-500">{periodSlashSuffix(displayPeriod)}</span>
            </div>
          )}
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
              <span className="text-sm font-semibold text-slate-800">{getLabel('student_loan_plan_plan_4')}</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
