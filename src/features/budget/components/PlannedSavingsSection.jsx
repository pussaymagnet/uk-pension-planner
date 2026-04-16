import { SectionCard, EditIcon, DeleteIcon } from './BudgetPrimitives';

/**
 * Planned savings list, add button, and savings form.
 */
export function PlannedSavingsSection({
  savings,
  committedGoalsMonthlyTotal,
  showSavingsForm,
  editingSavingId,
  savingsFormValues,
  savingsErrors,
  handleSavingsFormChange,
  saveSavingsForm,
  cancelSavingsForm,
  flashSavingId,
  openAddSaving,
  openEditSaving,
  deleteSavingEntry,
  savingsTotal,
  explicitSavingsTotal,
  fmt,
}) {
  return (
    <div className="pt-2">
      <h3 className="text-base font-semibold text-slate-800 mb-2">Planned savings</h3>
      {savings.length === 0 ? (
        <SectionCard>
          <p className="text-sm text-slate-400 italic text-center py-4">
            {committedGoalsMonthlyTotal > 0 ? (
              <>
                No planned savings entries yet. Included savings goals add {fmt(committedGoalsMonthlyTotal)} / month to
                planned savings — see Savings goals.
              </>
            ) : (
              <>
                No savings added. Use &quot;Add savings&quot; to track what you set aside each month.
              </>
            )}
          </p>
        </SectionCard>
      ) : (
        <SectionCard className="p-0 overflow-hidden">
          {savings.map((sv) => (
            <div
              key={sv.id}
              className={`flex items-center justify-between gap-3 border-b border-slate-100/90 px-4 py-3.5 last:border-0
                          transition-colors duration-200
                          ${flashSavingId === sv.id ? 'bg-emerald-50/60' : 'hover:bg-slate-50/90'}`}
            >
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800">{sv.name || 'Saving'}</span>
                <span className="mt-0.5 block text-[11px] text-slate-500">
                  {sv.allocationType === 'stocks' ? 'Stocks & shares' : 'Cash'}
                </span>
              </div>
              <span className="shrink-0 text-base font-semibold tabular-nums text-slate-900">{fmt(sv.amount)}</span>
              <div className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  aria-label={`Edit ${sv.name || 'savings'}`}
                  onClick={() => openEditSaving(sv)}
                  className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${sv.name || 'savings'}`}
                  onClick={() => deleteSavingEntry(sv.id)}
                  className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-500"
                >
                  <DeleteIcon />
                </button>
              </div>
            </div>
          ))}
          <div className="border-t border-slate-100/90 bg-slate-50/70 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-medium text-slate-600">Total planned savings</span>
              <span className="text-sm font-semibold tabular-nums text-slate-900">{fmt(savingsTotal)}</span>
            </div>
            {committedGoalsMonthlyTotal > 0 && (
              <p className="mt-1 text-[11px] leading-snug text-slate-500">
                {fmt(explicitSavingsTotal)} from entries + {fmt(committedGoalsMonthlyTotal)} from savings goals
              </p>
            )}
          </div>
        </SectionCard>
      )}

      {!showSavingsForm && (
        <button
          type="button"
          onClick={openAddSaving}
          className="mt-3 rounded-full bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-900"
        >
          Add savings
        </button>
      )}

      {showSavingsForm && (
        <SectionCard className="mt-3 bg-emerald-50 border-emerald-100">
          <p className="text-sm font-semibold text-slate-800 mb-3">
            {editingSavingId ? 'Edit savings' : 'Add savings'}
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="e.g. Emergency fund"
                value={savingsFormValues.name}
                onChange={(e) => handleSavingsFormChange('name', e.target.value)}
              />
              {savingsErrors.name && (
                <p className="text-xs text-red-500 mt-1">{savingsErrors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Monthly amount (£)</label>
              <input
                type="number"
                min="0"
                step="1"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="0"
                value={savingsFormValues.amount}
                onChange={(e) => handleSavingsFormChange('amount', e.target.value)}
              />
              {savingsErrors.amount && (
                <p className="text-xs text-red-500 mt-1">{savingsErrors.amount}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Save as</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={savingsFormValues.allocationType === 'stocks' ? 'stocks' : 'cash'}
                onChange={(e) => handleSavingsFormChange('allocationType', e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="stocks">Stocks &amp; shares</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={saveSavingsForm}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm
                           font-semibold py-2 rounded-xl transition-colors"
              >
                {editingSavingId ? 'Update' : 'Save'}
              </button>
              <button
                type="button"
                onClick={cancelSavingsForm}
                className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700
                           text-sm font-medium py-2 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
