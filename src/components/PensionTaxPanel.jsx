import { useId, useState } from 'react';
import { formatCurrency } from '../utils/calculations';
import { getLabel, periodSlashSuffix } from '../utils/fieldLabels';

const r2 = (n) => Math.round(n * 100) / 100;

const ENGLAND_CONFIG = {
  'Personal Allowance': {
    colour: 'bg-slate-100 border-slate-300 text-slate-700',
    dot: 'bg-slate-400',
    rate: '0%',
    summary:
      'Part of your pay may fall in a range where no income tax is taken (the “tax-free” slice). You can still pay into a pension.',
  },
  'Basic Rate': {
    colour: 'bg-blue-50 border-blue-300 text-blue-800',
    dot: 'bg-blue-500',
    rate: '20%',
    summary:
      'The next chunk of your taxable pay is taxed at 20% — this is the usual “basic” rate.',
  },
  'Higher Rate': {
    colour: 'bg-amber-50 border-amber-300 text-amber-800',
    dot: 'bg-amber-500',
    rate: '40%',
    summary:
      'Some of your pay is in the band where income tax is 40%. Pension payments can sometimes reduce which band applies.',
  },
  'Additional Rate': {
    colour: 'bg-red-50 border-red-300 text-red-800',
    dot: 'bg-red-500',
    rate: '45%',
    summary:
      'Some of your pay is taxed at the top 45% rate. Pension rules can be more complex here — get advice if unsure.',
  },
};

const SCOTLAND_CONFIG = {
  'Personal Allowance': ENGLAND_CONFIG['Personal Allowance'],
  'Starter Rate': {
    colour: 'bg-sky-50 border-sky-300 text-sky-900',
    dot: 'bg-sky-500',
    rate: '19%',
    summary:
      'Part of your pay is taxed at 19% — Scotland uses several bands; this is the first one above the tax-free amount.',
  },
  'Scottish Basic Rate': {
    colour: 'bg-blue-50 border-blue-300 text-blue-800',
    dot: 'bg-blue-500',
    rate: '20%',
    summary: 'Some of your pay is taxed at 20% (Scottish “basic” band).',
  },
  'Intermediate Rate': {
    colour: 'bg-indigo-50 border-indigo-300 text-indigo-900',
    dot: 'bg-indigo-500',
    rate: '21%',
    summary:
      'Some of your pay is taxed at 21% — Scottish income tax has extra bands compared with England.',
  },
  'Scottish Higher Rate': {
    colour: 'bg-amber-50 border-amber-300 text-amber-800',
    dot: 'bg-amber-500',
    rate: '42%',
    summary: 'Some of your pay is taxed at 42%. Pension payments can change which band applies.',
  },
  'Advanced Rate': {
    colour: 'bg-orange-50 border-orange-300 text-orange-900',
    dot: 'bg-orange-500',
    rate: '45%',
    summary: 'Some of your pay is taxed at 45%.',
  },
  'Top Rate': {
    colour: 'bg-red-50 border-red-300 text-red-800',
    dot: 'bg-red-500',
    rate: '48%',
    summary: 'Some of your pay is taxed at 48% — the highest Scottish rate on earnings.',
  },
};

/**
 * Unified headline metrics + tax band card with one expandable "More detail" section.
 * Values from calculateFullPosition (see calculations.js).
 */
export default function PensionTaxPanel({
  taxBand,
  updatedAdjustedIncome = 0,
  takeHome,
  displayPeriod = 'annual',
  grossSalary = 0,
  taxRegion = 'england',
  reliefAtSourceExtraSaRelief = 0,
  taxBandBeforePersonalPension,
  hasDroppedTaxBand = false,
  personalPensionNet = 0,
}) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();

  if (!Number(grossSalary)) return null;
  if (!takeHome) return null;

  const isScotland = taxRegion === 'scotland';
  const cfgMap = isScotland ? SCOTLAND_CONFIG : ENGLAND_CONFIG;
  const cfg =
    cfgMap[taxBand] ??
    (isScotland ? SCOTLAND_CONFIG['Scottish Basic Rate'] : ENGLAND_CONFIG['Basic Rate']);

  const isMonthly = displayPeriod === 'monthly';
  const {
    netTakeHomeMonthly,
    netTakeHomeAnnual,
    netTakeHomeAfterPensionMonthly,
    netTakeHomeAfterPensionAnnual,
    studentLoanRepaymentAnnual = 0,
  } = takeHome;

  const hasStudentLoan = studentLoanRepaymentAnnual > 0;
  const afterPensionBeforeLoan = isMonthly
    ? (netTakeHomeAfterPensionMonthly ?? netTakeHomeMonthly)
    : (netTakeHomeAfterPensionAnnual ?? netTakeHomeAnnual);
  const afterAll = isMonthly ? netTakeHomeMonthly : netTakeHomeAnnual;
  const headlineNet = hasStudentLoan ? afterAll : afterPensionBeforeLoan;

  const period = periodSlashSuffix(displayPeriod);

  const saRelief = Number(reliefAtSourceExtraSaRelief) || 0;
  const showMarginalReliefNote = saRelief > 0;
  const ppNet = Number(personalPensionNet) || 0;
  const showPensionNote =
    ppNet > 0 && taxBandBeforePersonalPension != null && taxBandBeforePersonalPension !== taxBand;

  return (
    <div className={`rounded-2xl border-2 p-4 ${cfg.colour}`}>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-2 text-sm">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <span
            className={`inline-block h-3 w-3 shrink-0 rounded-full ${cfg.dot}`}
            aria-hidden
          />
          <span className="text-xl font-bold tabular-nums">{cfg.rate}</span>
          <span className="font-semibold text-slate-900">{taxBand}</span>
        </div>
        <span className="hidden text-slate-400 sm:inline" aria-hidden>
          ·
        </span>
        <div className="min-w-0">
          <span className="text-slate-600">{getLabel('adjusted_income')}</span>{' '}
          <span className="font-semibold tabular-nums text-slate-900">
            {formatCurrency(r2(updatedAdjustedIncome))}
          </span>
        </div>
        <span className="hidden text-slate-400 sm:inline" aria-hidden>
          ·
        </span>
        <div className="min-w-0">
          <span className="text-slate-600">{getLabel('net_take_home')}</span>{' '}
          <span className="font-semibold tabular-nums text-blue-800">
            {formatCurrency(r2(headlineNet))}
          </span>
          <span className="ml-0.5 text-xs text-slate-500">{period}</span>
        </div>
      </div>

      <button
        type="button"
        className="text-xs font-medium text-slate-600 hover:text-slate-900 underline cursor-pointer"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? getLabel('hide_detail') : getLabel('more_detail')}
      </button>

      {expanded && (
        <div
          id={detailsId}
          className="mt-3 text-slate-700 border-t border-black/10 pt-3 space-y-3 text-sm"
        >
          <p className="text-xs leading-relaxed">{cfg.summary}</p>

          {showPensionNote && (
            <p className="leading-relaxed text-xs border-t border-black/10 pt-3">
              {getLabel('personal_pension_net')}:{' '}
              <span className="font-medium">{taxBandBeforePersonalPension}</span>
              {hasDroppedTaxBand ? ` — ${getLabel('dropped_tax_band')}` : ''}
            </p>
          )}

          {showMarginalReliefNote && (
            <div className="border-t border-black/10 pt-3 text-xs leading-relaxed">
              <span className="text-slate-700">{getLabel('self_assessment_relief')}</span>{' '}
              <span className="font-semibold tabular-nums text-slate-900">
                {formatCurrency(r2(saRelief))}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
