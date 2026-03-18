/**
 * PensionValueCard
 *
 * Shows the concrete monetary value of each contribution type so the
 * user can see how generous the tax system and their employer are.
 *
 * Two contribution models:
 *  - Salary sacrifice: saves income tax + NI → those savings are "free money"
 *  - Personal pension (relief at source): HMRC adds 20%; higher-rate
 *    payers can also claim extra via Self Assessment
 *
 * Props:
 *  pensionValue  — from calculateFullPosition
 *  displayPeriod — 'annual' | 'monthly'
 */

const fmtRaw = (value) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);

const r2 = (n) => Math.round(n * 100) / 100;

const MoneyRow = ({ label, value, subLabel }) => (
  <div className="flex justify-between items-start py-1.5">
    <div>
      <span className="text-sm text-slate-600">{label}</span>
      {subLabel && <p className="text-xs text-slate-400">{subLabel}</p>}
    </div>
    <span className="text-sm font-semibold text-slate-800 shrink-0 ml-4">{fmtRaw(value)}</span>
  </div>
);

const SectionLabel = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-4 mb-1">
    {children}
  </p>
);

export default function PensionValueCard({ pensionValue, displayPeriod = 'annual' }) {
  if (!pensionValue) return null;

  const {
    // Sacrifice
    sacrificeGross,
    sacIncomeTaxSaving,
    sacNiSaving,
    sacTotalSaving,
    sacNetCost,
    sacPotPerPound,
    // Personal pension
    ppGross,
    ppNet,
    ppBasicRelief,
    ppSaRelief,
    ppSaReliefPct,
    ppEffectiveCost,
    ppPotPerPound,
    // Employer + combined
    employerGross,
    totalBonus,
    taxBand,
  } = pensionValue;

  const hasSacrifice       = sacrificeGross > 0;
  const hasPersonalPension = ppGross > 0;
  const hasEmployer        = employerGross > 0;
  const hasAny             = hasSacrifice || hasPersonalPension || hasEmployer;

  if (!hasAny) return null;

  const isMonthly = displayPeriod === 'monthly';
  // Wrapper: divide annual value by 12 when in monthly mode
  const fmt = (annual) => fmtRaw(isMonthly ? r2(annual / 12) : annual);
  const periodLabel = isMonthly ? '/month' : '/year';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Value of Your Pension</h2>
      <p className="text-sm text-slate-500 mb-4">
        All the "free money" you receive beyond what you personally pay.
      </p>

      {/* ── Salary sacrifice section ── */}
      {hasSacrifice && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-green-800 mb-2">Salary Sacrifice</p>
          <p className="text-xs text-green-700 mb-3">
            Sacrifice reduces your taxable income → you pay less income tax AND National Insurance.
          </p>
          <MoneyRow label={`Gross amount sacrificed (${periodLabel})`}  value={fmt(sacrificeGross)} />
          <MoneyRow
            label={`Income tax saved (${periodLabel})`}
            value={fmt(sacIncomeTaxSaving)}
            subLabel="less income tax on reduced salary"
          />
          <MoneyRow
            label={`NI saved (${periodLabel})`}
            value={fmt(sacNiSaving)}
            subLabel="less NI on reduced salary"
          />
          <div className="border-t border-green-200 mt-2 pt-2 flex justify-between">
            <span className="text-sm font-semibold text-green-800">True net cost to you ({periodLabel})</span>
            <span className="text-sm font-bold text-green-900">{fmt(sacNetCost)}</span>
          </div>
          {sacPotPerPound !== null && (
            <p className="text-xs text-green-700 mt-2 font-medium">
              Every £1 of net cost puts <strong>£{sacPotPerPound.toFixed(2)}</strong> in your pension pot.
            </p>
          )}
        </div>
      )}

      {/* ── Personal pension section ── */}
      {hasPersonalPension && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">Personal Pension — Relief at Source</p>
          <p className="text-xs text-blue-700 mb-3">
            For every £80 you pay, HMRC adds £20 automatically.
            {ppSaReliefPct > 0 && ` As a ${taxBand} taxpayer you can reclaim a further ${ppSaReliefPct}% via Self Assessment.`}
          </p>
          <MoneyRow label={`Gross landed in pension pot (${periodLabel})`}    value={fmt(ppGross)} />
          <MoneyRow label={`HMRC basic-rate top-up +20% (${periodLabel})`}    value={fmt(ppBasicRelief)} subLabel="claimed by your provider" />
          {ppSaRelief > 0 && (
            <MoneyRow
              label={`Higher-rate SA reclaim ${ppSaReliefPct}% (${periodLabel})`}
              value={fmt(ppSaRelief)}
              subLabel="claim via Self Assessment tax return"
            />
          )}
          <div className="border-t border-blue-200 mt-2 pt-2 flex justify-between">
            <span className="text-sm font-semibold text-blue-800">Effective cost after all relief ({periodLabel})</span>
            <span className="text-sm font-bold text-blue-900">{fmt(ppEffectiveCost)}</span>
          </div>
          {ppPotPerPound !== null && (
            <p className="text-xs text-blue-700 mt-2 font-medium">
              Every £1 of effective cost puts <strong>£{ppPotPerPound.toFixed(2)}</strong> in your pension pot.
            </p>
          )}
        </div>
      )}

      {/* ── This year's free money ── */}
      <div className="border-t border-slate-100 pt-4">
        <SectionLabel>Total "Free Money" ({periodLabel})</SectionLabel>
        {hasSacrifice && (
          <MoneyRow label="Tax &amp; NI saved on salary sacrifice" value={fmt(sacTotalSaving)} />
        )}
        {hasPersonalPension && (
          <MoneyRow label="HMRC basic-rate top-up on personal pension" value={fmt(ppBasicRelief)} />
        )}
        {ppSaRelief > 0 && (
          <MoneyRow label={`Higher-rate SA reclaim (${ppSaReliefPct}%)`} value={fmt(ppSaRelief)} />
        )}
        {hasEmployer && (
          <MoneyRow label="Employer contribution" value={fmt(employerGross)} />
        )}
        <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-700">Total bonus beyond your cost</span>
          <span className="text-base font-bold text-green-700">{fmt(totalBonus)}</span>
        </div>
      </div>
    </div>
  );
}
