import { formatCurrency } from '../utils/calculations';

/**
 * Horizontal bar chart from buildPensionBenefitChartData — no recalculation.
 *
 * @param {{ data: { label: string, value: number, source_key: string }[] }} props
 */
export default function PensionBenefitBarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const scale = max > 0 ? max : 1;

  if (!data.length) {
    return (
      <p className="text-xs text-slate-500">No positive components to show.</p>
    );
  }

  return (
    <div className="space-y-3" aria-label="Where your pension benefits come from">
      <h3 className="text-sm font-semibold text-slate-800">
        Where your pension benefits come from
      </h3>
      <ul className="m-0 list-none space-y-3 p-0">
        {data.map((row) => (
          <li key={row.source_key}>
            <div className="flex justify-between gap-2 text-xs text-slate-700">
              <span>{row.label}</span>
              <span className="font-medium tabular-nums">{formatCurrency(row.value)}</span>
            </div>
            <div
              className="mt-1 h-2.5 overflow-hidden rounded bg-slate-200"
              role="presentation"
            >
              <div
                className="h-full rounded bg-indigo-500 transition-[width]"
                style={{ width: `${(row.value / scale) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
