import { SectionCard } from './BudgetPrimitives';
import {
  LOCAL_DATA_NUDGE_BODY,
  LOCAL_DATA_NUDGE_TITLE,
  NET_INCOME_EMPTY_HINT,
  NET_INCOME_HELP,
  NET_INCOME_ZERO_HINT,
} from '../constants/copy';

export function BudgetSummaryPanel({
  fmt,
  netMonthlyIncome,
  p1Remain,
  baseLeftover,
  fixedP1Total,
  niceP1Total,
  debtMonthlyTotal,
  creditCardMinimumTotal,
  savingsTotal,
  p1CommittedTotal,
  unexpectedSpendingBuffer,
  handleUnexpectedBufferChange,
  availableForGoals,
  user,
  expenditures,
  debts,
  savings,
  creditCards,
  goalSavings,
}) {
  return (
    <div className="order-1 space-y-4 lg:order-2 lg:col-span-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:self-start">

      <SectionCard className="overflow-hidden p-0">
        <div className="border-b border-slate-100/90 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Net monthly income</p>
          {netMonthlyIncome > 0 ? (
            <>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-800 tabular-nums">
                {fmt(netMonthlyIncome)}
              </p>
              <p className="mt-1 text-xs text-slate-500">{NET_INCOME_HELP}</p>
            </>
          ) : (
            <>
              <p className="mt-1 text-2xl font-medium text-slate-300 tabular-nums">—</p>
              <p className="mt-1 text-xs text-slate-500">{NET_INCOME_EMPTY_HINT}</p>
            </>
          )}
        </div>

        {netMonthlyIncome > 0 && (
          <div className="bg-slate-50/90 px-5 py-6">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Left this month</p>
            <p
              className={`mt-1 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl ${
                p1Remain >= 0 ? 'text-slate-900' : 'text-amber-900'
              }`}
            >
              {fmt(baseLeftover)}
            </p>
            <p className="mt-2 text-sm leading-snug text-slate-600">
              Safe to spend after bills, debt &amp; savings
            </p>
            {p1Remain < 0 && (
              <p className="mt-3 text-sm text-amber-800/90">
                This month looks tight — your plan is over your take-home. Adjust costs or check your income.
              </p>
            )}
          </div>
        )}

        {netMonthlyIncome <= 0 && (
          <div className="px-5 py-4">
            <p className="text-sm text-slate-500">{NET_INCOME_ZERO_HINT}</p>
          </div>
        )}

        {netMonthlyIncome > 0 && (
          <div className="space-y-3 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Breakdown</p>
            <ul className="space-y-2.5 text-sm">
              <li className="flex justify-between gap-4">
                <span className="text-slate-600">Essential costs</span>
                <span className="font-medium tabular-nums text-slate-900">{fmt(fixedP1Total)}</span>
              </li>
              <li className="flex justify-between gap-4">
                <span className="text-slate-600">Flexible spending</span>
                <span className="font-medium tabular-nums text-slate-900">{fmt(niceP1Total)}</span>
              </li>
              <li className="flex justify-between gap-4">
                <span className="text-slate-600">Debt repayments</span>
                <span className="font-medium tabular-nums text-slate-900">{fmt(debtMonthlyTotal)}</span>
              </li>
              <li className="flex justify-between gap-4">
                <span className="text-slate-600">Credit card payments</span>
                <span className="font-medium tabular-nums text-slate-900">{fmt(creditCardMinimumTotal)}</span>
              </li>
              <li className="flex justify-between gap-4">
                <span className="text-slate-600">Planned savings</span>
                <span className="font-medium tabular-nums text-slate-900">{fmt(savingsTotal)}</span>
              </li>
              <li className="flex justify-between gap-4 border-t border-slate-100 pt-3">
                <span className="font-medium text-slate-800">Total planned outgoings</span>
                <span className="font-semibold tabular-nums text-slate-900">{fmt(p1CommittedTotal)}</span>
              </li>
            </ul>
          </div>
        )}

        {netMonthlyIncome > 0 && (
          <div className="border-t border-slate-100/90 px-5 py-4">
            <p className="text-xs font-medium text-slate-600">Monthly buffer</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Optional reserve — does not change total outgoings or net income.
            </p>
            <div className="relative mt-2 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
              <input
                id="unexpected-buffer"
                type="number"
                min="0"
                step="0.01"
                value={unexpectedSpendingBuffer}
                onChange={handleUnexpectedBufferChange}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-7 pr-3 text-sm text-slate-800 shadow-sm transition-shadow focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="0"
              />
            </div>
          </div>
        )}

        {netMonthlyIncome > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100/90 px-5 py-4">
            <span className="text-sm font-medium text-slate-700">Available for goals</span>
            <span
              className={`text-xl font-semibold tabular-nums ${
                availableForGoals > 0 ? 'text-slate-900' : 'text-slate-500'
              }`}
            >
              {fmt(availableForGoals)}
            </span>
          </div>
        )}
      </SectionCard>

      {!user &&
        (expenditures.length > 0 ||
          debts.length > 0 ||
          savings.length > 0 ||
          creditCards.length > 0 ||
          goalSavings.length > 0) && (
        <div className="rounded-2xl border border-amber-100/90 bg-amber-50/80 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-xs font-semibold text-amber-800">{LOCAL_DATA_NUDGE_TITLE}</p>
          <p className="mt-0.5 text-xs text-amber-700/90">{LOCAL_DATA_NUDGE_BODY}</p>
        </div>
      )}
    </div>
  );
}
