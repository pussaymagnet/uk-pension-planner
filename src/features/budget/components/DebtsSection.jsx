import { calculateTotalInterest } from '../../../utils/debt';
import { SectionCard, Label, EditIcon, DeleteIcon } from './BudgetPrimitives';

/**
 * Debt form + amortizing loan list.
 */
export function DebtsSection({
  showForm,
  showDebtForm,
  showCreditCardForm,
  showSavingsForm,
  showGoalForm,
  editingDebtId,
  debtFormValues,
  debtErrors,
  handleDebtFormChange,
  saveDebtForm,
  cancelDebtForm,
  debts,
  debtMonthly,
  debtMonthlyTotal,
  flashDebtId,
  openAddDebt,
  openEditDebt,
  deleteDebtEntry,
  fmt,
  r2,
  formatTermLabel,
}) {
  const showAddDebtButton =
    !showForm && !showDebtForm && !showCreditCardForm && !showSavingsForm && !showGoalForm;

  return (
    <>
      {showDebtForm && (
        <SectionCard>
          <h3 className="text-base font-semibold text-slate-900 mb-4">
            {editingDebtId ? 'Edit debt' : 'New debt'}
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Repayment is calculated as a standard amortizing loan (APR compounded monthly).
            Your monthly payment is deducted from money available after bills.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="debt-name">Name (optional)</Label>
              <input
                id="debt-name"
                type="text"
                placeholder="e.g. Car loan, Credit card"
                value={debtFormValues.name}
                onChange={(e) => handleDebtFormChange('name', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="debt-principal">Amount borrowed (£)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                <input
                  id="debt-principal"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={debtFormValues.principal}
                  onChange={(e) => handleDebtFormChange('principal', e.target.value)}
                  className={`w-full pl-7 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${debtErrors.principal ? 'border-red-400' : 'border-slate-300'}`}
                />
              </div>
              {debtErrors.principal && (
                <p className="text-xs text-red-500 mt-1">{debtErrors.principal}</p>
              )}
            </div>
            <div>
              <Label htmlFor="debt-rate">Interest rate (% per year)</Label>
              <div className="relative">
                <input
                  id="debt-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={debtFormValues.annualRate}
                  onChange={(e) => handleDebtFormChange('annualRate', e.target.value)}
                  className={`w-full pr-8 pl-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${debtErrors.annualRate ? 'border-red-400' : 'border-slate-300'}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
              </div>
              {debtErrors.annualRate && (
                <p className="text-xs text-red-500 mt-1">{debtErrors.annualRate}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="debt-term">Term (years)</Label>
              <input
                id="debt-term"
                type="number"
                min="0"
                step="0.25"
                placeholder="e.g. 5"
                value={debtFormValues.termYears}
                onChange={(e) => handleDebtFormChange('termYears', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${debtErrors.termYears ? 'border-red-400' : 'border-slate-300'}`}
              />
              {debtErrors.termYears && (
                <p className="text-xs text-red-500 mt-1">{debtErrors.termYears}</p>
              )}
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={saveDebtForm}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancelDebtForm}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </SectionCard>
      )}

      <div className="pt-2">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-800">Debts &amp; loans</h3>
          {showAddDebtButton && (
            <button
              type="button"
              onClick={openAddDebt}
              className="rounded-full bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-900"
            >
              Add debt
            </button>
          )}
        </div>
        {debts.length === 0 ? (
          <SectionCard>
            <p className="text-sm text-slate-400 italic text-center py-4">
              No debts added. Use &quot;Add debt&quot; to include repayments in your available money.
            </p>
          </SectionCard>
        ) : (
          <SectionCard className="p-0 overflow-hidden">
            {debts.map((d) => {
              const dm = debtMonthly(d);
              const interestTotal = calculateTotalInterest(d.principal, dm, d.termMonths);
              return (
                <div
                  key={d.id}
                  className={`flex flex-wrap items-start justify-between gap-3 border-b border-slate-100/90 px-4 py-3.5 last:border-0
                              transition-colors duration-200
                              ${flashDebtId === d.id ? 'bg-emerald-50/60' : 'hover:bg-slate-50/90'}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{d.name || 'Debt'}</p>
                    <p className="mt-1 text-xs tabular-nums text-slate-500">
                      {fmt(d.principal)} borrowed · {r2(d.annualRatePct)}% APR · {formatTermLabel(d.termMonths)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">Interest over term: {fmt(interestTotal)}</p>
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    <div className="text-right">
                      <p className="text-lg font-semibold tracking-tight tabular-nums text-slate-900">{fmt(dm)}</p>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">/ month</p>
                    </div>
                    <div className="flex gap-0.5 pt-0.5">
                      <button
                        type="button"
                        aria-label={`Edit ${d.name || 'debt'}`}
                        onClick={() => openEditDebt(d)}
                        className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${d.name || 'debt'}`}
                        onClick={() => deleteDebtEntry(d.id)}
                        className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-500"
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between gap-3 border-t border-slate-100/90 bg-slate-50/70 px-4 py-3">
              <span className="text-sm font-medium text-slate-600">Total repayments / month</span>
              <span className="text-sm font-semibold tabular-nums text-slate-900">{fmt(debtMonthlyTotal)}</span>
            </div>
          </SectionCard>
        )}
      </div>
    </>
  );
}
