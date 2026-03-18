/**
 * TargetCard — shows whether the 15% combined contribution target is met
 * and, for higher/additional rate payers, prompts Self Assessment relief.
 */
import { formatCurrency } from '../utils/calculations';

export default function TargetCard({ recommendation, grossSalary }) {
  const {
    meetsTarget,
    currentTotal,
    target,
    shortfallPercent,
    monthlyNetNeeded,
    eligibleForAdditionalRelief,
    additionalReliefPercent,
    additionalReliefAnnual,
    message,
  } = recommendation;

  if (!grossSalary) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">{target}% Contribution Target</h2>
        <p className="text-sm text-slate-400 italic">Enter your salary to see your target analysis.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">{target}% Contribution Target</h2>

      {/* Target status */}
      <div className={`rounded-xl p-4 border ${meetsTarget ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-start gap-3">
          <span className="text-xl shrink-0">{meetsTarget ? '✅' : '⚡'}</span>
          <div>
            <p className={`text-sm font-semibold mb-1 ${meetsTarget ? 'text-emerald-800' : 'text-amber-800'}`}>
              {meetsTarget ? 'Target Met' : 'Below Target'}
            </p>
            <p className={`text-sm leading-relaxed ${meetsTarget ? 'text-emerald-700' : 'text-amber-700'}`}>
              {message}
            </p>
          </div>
        </div>
      </div>

      {/* Progress bars */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Combined: {currentTotal}%</span>
          <span>Target: {target}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${meetsTarget ? 'bg-emerald-500' : 'bg-amber-400'}`}
            style={{ width: `${Math.min(100, (currentTotal / target) * 100)}%` }}
          />
        </div>
      </div>

      {/* Shortfall detail */}
      {!meetsTarget && monthlyNetNeeded > 0 && (
        <div className="text-sm text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span>Shortfall</span>
            <span className="font-medium">{shortfallPercent}% of salary</span>
          </div>
          <div className="flex justify-between">
            <span>Extra needed (monthly net)</span>
            <span className="font-semibold text-amber-700">{formatCurrency(monthlyNetNeeded)}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Net figure already accounts for 20% basic-rate relief at source.
          </p>
        </div>
      )}

      {/* Higher/additional rate Self Assessment prompt */}
      {eligibleForAdditionalRelief && (
        <div className="rounded-xl p-3 bg-blue-50 border border-blue-200 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <span className="shrink-0">💡</span>
            <div>
              <p className="font-semibold mb-1">Extra {additionalReliefPercent}% relief available</p>
              <p className="leading-relaxed">
                As a higher/additional rate taxpayer you can reclaim an extra{' '}
                <strong>{additionalReliefPercent}%</strong> on your personal contributions via your{' '}
                <strong>Self Assessment</strong> tax return — worth approximately{' '}
                <strong>{formatCurrency(additionalReliefAnnual)}</strong> per year based on your
                current contribution level.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
