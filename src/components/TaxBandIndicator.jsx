/**
 * TaxBandIndicator — coloured badge for income tax band (England & Wales, or Scotland).
 * Extra pension / Self Assessment copy when band-capped extra relief on net personal
 * pension (relief at source) is greater than zero.
 * When personal pension is entered, taxBand reflects pension-adjusted income
 * (see calculateDynamicTaxBand in calculations.js).
 */

const ENGLAND_CONFIG = {
  'Personal Allowance': {
    colour: 'bg-slate-100 border-slate-300 text-slate-700',
    dot:    'bg-slate-400',
    rate:   '0%',
    summary:
      'No income tax is due on income covered by your personal allowance. You can still save into a pension.',
  },
  'Basic Rate': {
    colour: 'bg-blue-50 border-blue-300 text-blue-800',
    dot:    'bg-blue-500',
    rate:   '20%',
    summary: 'Your top slice of income is taxed at the basic rate of 20%.',
  },
  'Higher Rate': {
    colour: 'bg-amber-50 border-amber-300 text-amber-800',
    dot:    'bg-amber-500',
    rate:   '40%',
    summary: 'Your top slice of income is taxed at the higher rate of 40%.',
  },
  'Additional Rate': {
    colour: 'bg-red-50 border-red-300 text-red-800',
    dot:    'bg-red-500',
    rate:   '45%',
    summary: 'Your top slice of income is taxed at the additional rate of 45%.',
  },
};

const SCOTLAND_CONFIG = {
  'Personal Allowance': ENGLAND_CONFIG['Personal Allowance'],
  'Starter Rate': {
    colour: 'bg-sky-50 border-sky-300 text-sky-900',
    dot:    'bg-sky-500',
    rate:   '19%',
    summary: 'Your top slice of income is taxed at the starter rate of 19%.',
  },
  'Scottish Basic Rate': {
    colour: 'bg-blue-50 border-blue-300 text-blue-800',
    dot:    'bg-blue-500',
    rate:   '20%',
    summary: 'Your top slice of income is taxed at the Scottish basic rate of 20%.',
  },
  'Intermediate Rate': {
    colour: 'bg-indigo-50 border-indigo-300 text-indigo-900',
    dot:    'bg-indigo-500',
    rate:   '21%',
    summary: 'Your top slice of income is taxed at the intermediate rate of 21%.',
  },
  'Scottish Higher Rate': {
    colour: 'bg-amber-50 border-amber-300 text-amber-800',
    dot:    'bg-amber-500',
    rate:   '42%',
    summary: 'Your top slice of income is taxed at the Scottish higher rate of 42%.',
  },
  'Advanced Rate': {
    colour: 'bg-orange-50 border-orange-300 text-orange-900',
    dot:    'bg-orange-500',
    rate:   '45%',
    summary: 'Your top slice of income is taxed at the advanced rate of 45%.',
  },
  'Top Rate': {
    colour: 'bg-red-50 border-red-300 text-red-800',
    dot:    'bg-red-500',
    rate:   '48%',
    summary: 'Your top slice of income is taxed at the top rate of 48%.',
  },
};

const SA_EXTRA_RELIEF_NOTE =
  'If you pay into a personal pension, you may be able to claim further relief above the basic 20% added at source by completing a Self Assessment tax return.';

export default function TaxBandIndicator({
  taxBand,
  grossSalary,
  taxRegion = 'england',
  reliefAtSourceExtraSaRelief = 0,
  taxBandBeforePersonalPension,
  hasDroppedTaxBand = false,
  personalPensionNet = 0,
}) {
  if (!grossSalary) return null;

  const isScotland = taxRegion === 'scotland';
  const cfgMap = isScotland ? SCOTLAND_CONFIG : ENGLAND_CONFIG;
  const cfg = cfgMap[taxBand] ?? (isScotland ? SCOTLAND_CONFIG['Scottish Basic Rate'] : ENGLAND_CONFIG['Basic Rate']);

  const showMarginalReliefNote = Number(reliefAtSourceExtraSaRelief) > 0;
  const ppNet = Number(personalPensionNet) || 0;
  const showPensionNote =
    ppNet > 0 &&
    taxBandBeforePersonalPension != null &&
    taxBandBeforePersonalPension !== taxBand;

  return (
    <div className={`rounded-2xl border-2 p-5 ${cfg.colour}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className={`inline-block w-3 h-3 rounded-full shrink-0 ${cfg.dot}`} />
        <span className="text-xs font-semibold uppercase tracking-wider">
          Tax Band{isScotland ? ' (Scotland)' : ' (England & Wales)'}
        </span>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold">{cfg.rate}</span>
        <span className="font-semibold text-base">{taxBand}</span>
      </div>
      <p className="text-sm leading-relaxed">{cfg.summary}</p>
      {showPensionNote && (
        <p className="text-sm leading-relaxed mt-2 border-t border-black/10 pt-2 opacity-90">
          Band includes your net personal pension grossed up (relief at source). Before pension:{' '}
          <span className="font-medium">{taxBandBeforePersonalPension}</span>.
          {hasDroppedTaxBand ? ' Marginal rate has reduced compared with no personal pension.' : ''}
        </p>
      )}
      {showMarginalReliefNote && (
        <p className="text-sm leading-relaxed mt-3 border-t border-black/10 pt-3 opacity-90">
          {SA_EXTRA_RELIEF_NOTE}
        </p>
      )}
    </div>
  );
}
