/**
 * AllowanceCard — Annual Allowance usage with a progress bar.
 * Green < 80%, amber 80–99%, red ≥ 100% (exceeding).
 */
import { formatCurrency } from '../utils/calculations';

const barColour = (pct, isExceeding) => {
  if (isExceeding) return 'bg-red-500';
  if (pct >= 80)   return 'bg-amber-400';
  return 'bg-emerald-500';
};

const textColour = (pct, isExceeding) => {
  if (isExceeding) return 'text-red-700';
  if (pct >= 80)   return 'text-amber-700';
  return 'text-emerald-700';
};

export default function AllowanceCard({ allowance }) {
  const { maxAllowance, usedAllowance, remainingAllowance, percentUsed, isExceeding, warning, employeeGross, employerGross } = allowance;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Annual Allowance</h2>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Used: {formatCurrency(usedAllowance)}</span>
          <span>Limit: {formatCurrency(maxAllowance)}</span>
        </div>
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColour(percentUsed, isExceeding)}`}
            style={{ width: `${Math.min(100, percentUsed)}%` }}
          />
        </div>
        <p className={`text-sm font-semibold mt-1 ${textColour(percentUsed, isExceeding)}`}>
          {percentUsed.toFixed(1)}% used
        </p>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-slate-600">Your contribution (gross)</span>
          <span className="font-medium tabular-nums">{formatCurrency(employeeGross)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Employer contribution</span>
          <span className="font-medium tabular-nums">{formatCurrency(employerGross)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-2">
          <span className="font-semibold text-slate-800">Remaining allowance</span>
          <span className={`font-bold tabular-nums ${isExceeding ? 'text-red-600' : 'text-emerald-600'}`}>
            {isExceeding ? '–' : ''}{formatCurrency(Math.abs(remainingAllowance))}
          </span>
        </div>
      </div>

      {/* Warning banner */}
      {warning && (
        <div className={`rounded-xl p-3 text-sm leading-relaxed ${isExceeding ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
          <span className="mr-1">{isExceeding ? '🚨' : '⚠️'}</span>
          {warning}
        </div>
      )}

      {!warning && usedAllowance > 0 && (
        <div className="rounded-xl p-3 text-sm bg-emerald-50 border border-emerald-200 text-emerald-800">
          ✅ Within your Annual Allowance — no excess charge applies.
        </div>
      )}
    </div>
  );
}
