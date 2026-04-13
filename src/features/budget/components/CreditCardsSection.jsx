import { SectionCard, Label, EditIcon, DeleteIcon } from './BudgetPrimitives';

/**
 * Credit card intro, form, list, and minimum payments total.
 */
export function CreditCardsSection({
  showForm,
  showDebtForm,
  showCreditCardForm,
  showSavingsForm,
  showGoalForm,
  editingCreditCardId,
  creditCardFormValues,
  creditCardErrors,
  handleCreditCardFormChange,
  saveCreditCardForm,
  cancelCreditCardForm,
  creditCards,
  flashCreditCardId,
  openAddCreditCard,
  openEditCreditCard,
  deleteCreditCardEntry,
  creditCardMinimumTotal,
  fmt,
  r2,
}) {
  const showAddCreditCardButton =
    !showCreditCardForm && !showForm && !showDebtForm && !showSavingsForm && !showGoalForm;

  return (
    <div className="pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-slate-800">Credit cards</h3>
        {showAddCreditCardButton && (
          <button
            type="button"
            onClick={openAddCreditCard}
            className="rounded-full bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-900"
          >
            Add credit card
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-2">
        Minimum monthly payments count toward outgoings. Balance is for your reference only.
      </p>

      {showCreditCardForm && (
        <SectionCard className="mb-3 bg-violet-50 border-violet-100">
          <h4 className="text-base font-semibold text-slate-900 mb-3">
            {editingCreditCardId ? 'Edit credit card' : 'New credit card'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="cc-name">Name (optional)</Label>
              <input
                id="cc-name"
                type="text"
                placeholder="e.g. Main card"
                value={creditCardFormValues.name}
                onChange={(e) => handleCreditCardFormChange('name', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <Label htmlFor="cc-balance">Total balance (£)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                <input
                  id="cc-balance"
                  type="number"
                  min="0"
                  step="0.01"
                  value={creditCardFormValues.totalBalance}
                  onChange={(e) => handleCreditCardFormChange('totalBalance', e.target.value)}
                  className={`w-full pl-7 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500
                    ${creditCardErrors.totalBalance ? 'border-red-400' : 'border-slate-300'}`}
                />
              </div>
              {creditCardErrors.totalBalance && (
                <p className="text-xs text-red-500 mt-1">{creditCardErrors.totalBalance}</p>
              )}
            </div>
            <div>
              <Label htmlFor="cc-min">Minimum payment (£ / month)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                <input
                  id="cc-min"
                  type="number"
                  min="0"
                  step="0.01"
                  value={creditCardFormValues.minimumMonthlyPayment}
                  onChange={(e) => handleCreditCardFormChange('minimumMonthlyPayment', e.target.value)}
                  className={`w-full pl-7 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500
                    ${creditCardErrors.minimumMonthlyPayment ? 'border-red-400' : 'border-slate-300'}`}
                />
              </div>
              {creditCardErrors.minimumMonthlyPayment && (
                <p className="text-xs text-red-500 mt-1">{creditCardErrors.minimumMonthlyPayment}</p>
              )}
            </div>
            <div>
              <Label htmlFor="cc-apr">APR % (optional)</Label>
              <div className="relative">
                <input
                  id="cc-apr"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="—"
                  value={creditCardFormValues.apr}
                  onChange={(e) => handleCreditCardFormChange('apr', e.target.value)}
                  className={`w-full pr-8 pl-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500
                    ${creditCardErrors.apr ? 'border-red-400' : 'border-slate-300'}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
              </div>
              {creditCardErrors.apr && (
                <p className="text-xs text-red-500 mt-1">{creditCardErrors.apr}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="cc-notes">Notes (optional)</Label>
              <textarea
                id="cc-notes"
                rows={2}
                placeholder="e.g. 0% offer ends March"
                value={creditCardFormValues.notes}
                onChange={(e) => handleCreditCardFormChange('notes', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={saveCreditCardForm}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancelCreditCardForm}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </SectionCard>
      )}

      {creditCards.length === 0 && !showCreditCardForm ? (
        <SectionCard>
          <p className="text-sm text-slate-400 italic text-center py-4">
            No credit cards added. Minimum payments reduce money left alongside loan repayments.
          </p>
        </SectionCard>
      ) : creditCards.length > 0 ? (
        <SectionCard className="p-0 overflow-hidden">
          {creditCards.map((cc) => (
            <div
              key={cc.id}
              className={`flex flex-wrap items-start justify-between gap-3 border-b border-slate-100/90 px-4 py-3.5 last:border-0
                          transition-colors duration-200
                          ${flashCreditCardId === cc.id ? 'bg-emerald-50/60' : 'hover:bg-slate-50/90'}`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{cc.name || 'Credit card'}</p>
                {cc.notes ? (
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">{cc.notes}</p>
                ) : null}
                <p className="mt-1 text-xs tabular-nums text-slate-500">
                  Balance {fmt(cc.totalBalance)}
                  {cc.apr != null ? ` · ${r2(cc.apr)}% APR` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-start gap-2">
                <div className="text-right">
                  <p className="text-lg font-semibold tracking-tight tabular-nums text-slate-900">
                    {fmt(cc.minimumMonthlyPayment)}
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">min / month</p>
                </div>
                <div className="flex gap-0.5 pt-0.5">
                  <button
                    type="button"
                    aria-label={`Edit ${cc.name || 'credit card'}`}
                    onClick={() => openEditCreditCard(cc)}
                    className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${cc.name || 'credit card'}`}
                    onClick={() => deleteCreditCardEntry(cc.id)}
                    className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-500"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100/90 bg-slate-50/70 px-4 py-3">
            <span className="text-sm font-medium text-slate-600">Total credit card payments / month</span>
            <span className="text-sm font-semibold tabular-nums text-slate-900">{fmt(creditCardMinimumTotal)}</span>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
