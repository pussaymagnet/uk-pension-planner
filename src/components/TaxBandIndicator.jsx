/**
 * TaxBandIndicator — prominent coloured badge showing the user's income tax band
 * and a short explanation of what it means for their pension relief.
 */

const BAND_CONFIG = {
  'Personal Allowance': {
    colour: 'bg-slate-100 border-slate-300 text-slate-700',
    dot:    'bg-slate-400',
    rate:   '0%',
    relief: 'You pay no income tax, but you can still contribute to a pension and benefit from basic-rate (20%) relief at source up to £3,600 gross per year.',
  },
  'Basic Rate': {
    colour: 'bg-blue-50 border-blue-300 text-blue-800',
    dot:    'bg-blue-500',
    rate:   '20%',
    relief: 'You receive 20% basic-rate relief automatically via relief at source — your provider claims it from HMRC. No further action needed.',
  },
  'Higher Rate': {
    colour: 'bg-amber-50 border-amber-300 text-amber-800',
    dot:    'bg-amber-500',
    rate:   '40%',
    relief: 'You receive 20% relief automatically, plus you can reclaim an extra 20% (total 40%) via your Self Assessment tax return each year.',
  },
  'Additional Rate': {
    colour: 'bg-red-50 border-red-300 text-red-800',
    dot:    'bg-red-500',
    rate:   '45%',
    relief: 'You receive 20% relief automatically, plus you can reclaim an extra 25% (total 45%) via your Self Assessment tax return each year.',
  },
};

export default function TaxBandIndicator({ taxBand, grossSalary }) {
  if (!grossSalary) return null;

  const cfg = BAND_CONFIG[taxBand] ?? BAND_CONFIG['Basic Rate'];

  return (
    <div className={`rounded-2xl border-2 p-5 ${cfg.colour}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className={`inline-block w-3 h-3 rounded-full shrink-0 ${cfg.dot}`} />
        <span className="text-xs font-semibold uppercase tracking-wider">Tax Band</span>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold">{cfg.rate}</span>
        <span className="font-semibold text-base">{taxBand}</span>
      </div>
      <p className="text-sm leading-relaxed">{cfg.relief}</p>
    </div>
  );
}
