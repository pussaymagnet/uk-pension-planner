/**
 * InputForm — controlled inputs for all financial details.
 *
 * Contribution types modelled:
 *  - Salary sacrifice (employee + employer): before income tax and NI.
 *    Mode toggle lets user enter these as % of salary or flat £ per year.
 *  - Personal pension (SIPP / relief at source): always entered as the
 *    net annual £ amount the employee physically pays; HMRC adds 20%.
 */

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

export default function InputForm({ values, onChange, contributionMode, onModeToggle }) {
  const handleChange = (field) => (val) => onChange(field, val);

  // Salary sacrifice fields (employee + employer) follow the mode toggle
  const isPercent = contributionMode === 'percent';
  const sacrificeProps = isPercent
    ? { suffix: '%', prefix: undefined, max: 100,       step: 0.5, hint: '% of salary — before tax & NI' }
    : { prefix: '£', suffix: undefined, max: 10000000,  step: 100, hint: 'annual gross £ — before tax & NI' };

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
          label="Gross Annual Salary"
          hint="before tax"
          prefix="£"
          value={values.grossSalary}
          onChange={handleChange('grossSalary')}
          min={0}
          max={10000000}
          step={1000}
        />

        {/* Salary sacrifice — employee */}
        <InputField
          label="Your Salary Sacrifice"
          hint={sacrificeProps.hint}
          prefix={sacrificeProps.prefix}
          suffix={sacrificeProps.suffix}
          value={values.employeeValue}
          onChange={handleChange('employeeValue')}
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
          value={values.employerValue}
          onChange={handleChange('employerValue')}
          min={0}
          max={sacrificeProps.max}
          step={sacrificeProps.step}
        />

        {/* Personal pension (SIPP) — always net £ */}
        <InputField
          label="Personal Pension Contribution"
          hint="net annual £ you pay — HMRC adds 20%"
          prefix="£"
          value={values.personalPensionNet}
          onChange={handleChange('personalPensionNet')}
          min={0}
          max={10000000}
          step={100}
        />
      </div>
    </div>
  );
}
