import { formatCurrency } from '../utils/calculations';

/**
 * @param {{
 *   summary: { label: string, yourMoney: number, freeMoney: number, grandTotal: number }[],
 *   detailed: { label: string, value: number, type: 'your_money' | 'free_money', source_key: string }[],
 * }} props
 */
export default function PensionValueStackedBarChart({ summary, detailed }) {
  const row = summary[0];
  if (!row) return null;

  const { yourMoney, freeMoney, grandTotal } = row;
  const freeLines = detailed.filter((d) => d.type === 'free_money' && d.value > 0);
  const yourLines = detailed.filter((d) => d.type === 'your_money' && d.value > 0);

  if (grandTotal <= 0) {
    return (
      <p className="text-xs text-slate-500">
        Add pension inputs to see how your money compares to extra benefits.
      </p>
    );
  }

  const yourPct = (yourMoney / grandTotal) * 100;
  const freePct = (freeMoney / grandTotal) * 100;

  const ariaLabel = `${row.label}: Your money ${formatCurrency(yourMoney)}, free money ${formatCurrency(freeMoney)}, total ${formatCurrency(grandTotal)}`;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Your money vs free money</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Free money includes employer contributions, tax relief, and tax savings.
        </p>
      </div>

      <div className="flex justify-between gap-2 text-xs text-slate-700">
        <span className="font-medium text-slate-600">Your Money</span>
        <span className="tabular-nums font-medium">{formatCurrency(yourMoney)}</span>
      </div>
      <div className="flex justify-between gap-2 text-xs text-slate-700">
        <span className="font-medium text-emerald-800">Free Money</span>
        <span className="tabular-nums font-medium">{formatCurrency(freeMoney)}</span>
      </div>

      <div
        className="flex h-4 w-full overflow-hidden rounded-md bg-slate-100"
        role="img"
        aria-label={ariaLabel}
      >
        <div
          className="h-full bg-slate-500 transition-[width]"
          style={{ width: `${yourPct}%` }}
          title={`Your Money — ${formatCurrency(yourMoney)}`}
        />
        <div
          className="h-full bg-emerald-500 transition-[width]"
          style={{ width: `${freePct}%` }}
          title={`Free Money — ${formatCurrency(freeMoney)}`}
        />
      </div>

      {yourLines.length > 0 && (
        <div className="text-xs text-slate-600">
          <span className="font-medium text-slate-700">Your contribution detail</span>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {yourLines.map((d) => (
              <li key={d.source_key}>
                {d.label} — {formatCurrency(d.value)}{' '}
                <span className="text-slate-400">({d.source_key})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {freeLines.length > 0 && (
        <div className="text-xs text-slate-600">
          <span className="font-medium text-emerald-900">Free money detail</span>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {freeLines.map((d) => (
              <li key={d.source_key}>
                {d.label} — {formatCurrency(d.value)}{' '}
                <span className="text-slate-400">({d.source_key})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
