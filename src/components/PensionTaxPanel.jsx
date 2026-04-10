import { useEffect, useId, useRef, useState } from 'react';
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
      'Part of your pay is taxed at 19% — the first band above the tax-free amount.',
  },
  'Scottish Basic Rate': {
    colour: 'bg-blue-50 border-blue-300 text-blue-800',
    dot: 'bg-blue-500',
    rate: '20%',
    summary: 'Some of your pay is taxed at 20% — the “basic” band.',
  },
  'Intermediate Rate': {
    colour: 'bg-indigo-50 border-indigo-300 text-indigo-900',
    dot: 'bg-indigo-500',
    rate: '21%',
    summary:
      'Some of your pay is taxed at 21%.',
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
    summary: 'Some of your pay is taxed at 48% — the highest rate on earnings.',
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
  allowance = null,
}) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const aaHelpId = useId();
  const helpPanelId = `aa-help-${aaHelpId.replace(/:/g, '')}`;
  const helpTriggerId = `aa-tr-${aaHelpId.replace(/:/g, '')}`;
  const [aaHelpOpen, setAaHelpOpen] = useState(false);
  const aaHelpWrapRef = useRef(null);

  useEffect(() => {
    if (!aaHelpOpen) return;
    const onDoc = (e) => {
      if (aaHelpWrapRef.current && !aaHelpWrapRef.current.contains(e.target)) {
        setAaHelpOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setAaHelpOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [aaHelpOpen]);

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

  const maxAA = allowance != null ? Number(allowance.maxAllowance) || 0 : 0;
  const usedAA = allowance != null ? Number(allowance.usedAllowance) || 0 : 0;
  const remainingAA = allowance != null ? Number(allowance.remainingAllowance) || 0 : 0;
  const pctUsed =
    allowance != null ? Math.min(100, Number(allowance.percentUsed) || 0) : 0;
  const aaExceeding = Boolean(allowance?.isExceeding);

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

      {allowance != null && maxAA > 0 && (
        <div ref={aaHelpWrapRef} className="relative mb-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-700">
              {getLabel('annual_allowance_section')}
            </span>
            <div className="relative shrink-0">
              <button
                type="button"
                id={helpTriggerId}
                aria-expanded={aaHelpOpen}
                aria-controls={helpPanelId}
                aria-label={getLabel('annual_allowance_help')}
                className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-slate-500/40 text-[10px] font-bold leading-none text-slate-600 hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                onClick={() => setAaHelpOpen((o) => !o)}
              >
                ?
              </button>
              {aaHelpOpen && (
                <div
                  id={helpPanelId}
                  role="dialog"
                  aria-label={getLabel('annual_allowance_help')}
                  className="absolute right-0 top-full z-20 mt-1 max-w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-3 text-left text-xs leading-relaxed text-slate-700 shadow-lg"
                >
                  {getLabel('annual_allowance_popover')}
                </div>
              )}
            </div>
          </div>
          <div className="mb-1 grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 text-xs text-slate-600">
            <span className="min-w-0 tabular-nums">
              {getLabel('annual_allowance_used')}{' '}
              <span className="font-semibold text-slate-900">
                {formatCurrency(r2(usedAA))}
              </span>
            </span>
            <span className="shrink-0 text-slate-400" aria-hidden>
              →
            </span>
            <span className="min-w-0 text-right tabular-nums">
              {getLabel('annual_allowance_remaining')}{' '}
              <span className="font-semibold text-slate-900">
                {formatCurrency(r2(remainingAA))}
              </span>
            </span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-black/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pctUsed)}
            aria-label={`${getLabel('annual_allowance_cap')}: ${formatCurrency(r2(maxAA))}, ${getLabel('annual_allowance_used')} ${formatCurrency(r2(usedAA))}`}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${
                aaExceeding ? 'bg-red-600' : 'bg-slate-700'
              }`}
              style={{ width: `${aaExceeding ? 100 : pctUsed}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-slate-500">
            <span>£0</span>
            <span>
              {getLabel('annual_allowance_cap')}{' '}
              {formatCurrency(r2(maxAA))}
            </span>
          </div>
        </div>
      )}

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
