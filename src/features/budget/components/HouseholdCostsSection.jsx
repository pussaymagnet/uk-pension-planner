import { SectionCard, Label } from './BudgetPrimitives';

/**
 * Expenditure form + essential / flexible lists + household total.
 */
export function HouseholdCostsSection({
  SECTION_FIXED,
  SECTION_NICE,
  showForm,
  editingId,
  formValues,
  errors,
  handleFormChange,
  saveForm,
  cancelForm,
  fixedExpenditures,
  niceExpenditures,
  expenditures,
  p1Total,
  combined,
  fixedP1Total,
  fixedCombined,
  niceP1Total,
  niceCombined,
  fmt,
  renderExpenditureRows,
  showDebtForm,
  showCreditCardForm,
  showSavingsForm,
  showGoalForm,
  openAddExpenditure,
}) {
  const showAddCostButtons =
    !showForm && !showDebtForm && !showCreditCardForm && !showSavingsForm && !showGoalForm;

  return (
    <>
      {showForm && (
        <SectionCard>
          <h3 className="text-base font-semibold text-slate-900 mb-4">
            {editingId ? 'Edit cost' : 'New cost'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="exp-name">Cost name</Label>
              <input
                id="exp-name"
                type="text"
                placeholder="e.g. Council Tax, Electricity, Mortgage"
                value={formValues.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${errors.name ? 'border-red-400' : 'border-slate-300'}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="exp-section">Section</Label>
              <select
                id="exp-section"
                value={formValues.section === SECTION_NICE ? SECTION_NICE : SECTION_FIXED}
                onChange={(e) => handleFormChange('section', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value={SECTION_FIXED}>Essential costs</option>
                <option value={SECTION_NICE}>Flexible spending</option>
              </select>
            </div>

            <div>
              <Label htmlFor="exp-amount">Monthly amount (£)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                <input
                  id="exp-amount"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={formValues.amount}
                  onChange={(e) => handleFormChange('amount', e.target.value)}
                  className={`w-full pl-7 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${errors.amount ? 'border-red-400' : 'border-slate-300'}`}
                />
              </div>
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            </div>

            <div>
              <Label htmlFor="exp-p1pct">My share %</Label>
              <div className="relative">
                <input
                  id="exp-p1pct"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={formValues.partner1Pct}
                  onChange={(e) => handleFormChange('partner1Pct', e.target.value)}
                  className={`w-full pr-8 pl-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${errors.partner1Pct ? 'border-red-400' : 'border-slate-300'}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
              </div>
              {errors.partner1Pct && <p className="text-xs text-red-500 mt-1">{errors.partner1Pct}</p>}
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={saveForm}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </SectionCard>
      )}

      <div className="space-y-6">
        <h3 className="text-base font-semibold text-slate-800">Household costs</h3>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h4 className="text-sm font-semibold text-slate-800">Essential costs</h4>
            {showAddCostButtons && (
              <button
                type="button"
                onClick={() => openAddExpenditure(SECTION_FIXED)}
                className="rounded-full bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-900"
              >
                Add cost
              </button>
            )}
          </div>
          {fixedExpenditures.length === 0 ? (
            <SectionCard>
              <p className="text-sm text-slate-400 italic text-center py-4">
                No essential costs yet. Add one or defaults will appear here.
              </p>
            </SectionCard>
          ) : (
            <SectionCard className="p-0 overflow-hidden">
              {renderExpenditureRows(fixedExpenditures)}
              <div className="flex items-center justify-between gap-3 border-t border-slate-100/90 bg-slate-50/70 px-4 py-3">
                <span className="text-sm font-medium text-slate-600">Essential costs subtotal</span>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-slate-900">{fmt(fixedP1Total)}</p>
                  <p className="text-[11px] text-slate-500 tabular-nums">{fmt(fixedCombined)} household</p>
                </div>
              </div>
            </SectionCard>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h4 className="text-sm font-semibold text-slate-800">Flexible spending</h4>
            {showAddCostButtons && (
              <button
                type="button"
                onClick={() => openAddExpenditure(SECTION_NICE)}
                className="rounded-full bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-900"
              >
                Add cost
              </button>
            )}
          </div>
          {niceExpenditures.length === 0 ? (
            <SectionCard>
              <p className="text-sm text-slate-400 italic text-center py-4">
                No flexible spending yet.
              </p>
            </SectionCard>
          ) : (
            <SectionCard className="p-0 overflow-hidden">
              {renderExpenditureRows(niceExpenditures)}
              <div className="flex items-center justify-between gap-3 border-t border-slate-100/90 bg-slate-50/70 px-4 py-3">
                <span className="text-sm font-medium text-slate-600">Flexible spending subtotal</span>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-slate-900">{fmt(niceP1Total)}</p>
                  <p className="text-[11px] text-slate-500 tabular-nums">{fmt(niceCombined)} household</p>
                </div>
              </div>
            </SectionCard>
          )}
        </div>

        {expenditures.length > 0 && (
          <SectionCard className="p-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-100/80 px-4 py-3.5">
              <span className="text-sm font-medium text-slate-700">Total household costs</span>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums text-slate-900">{fmt(p1Total)}</p>
                <p className="text-[11px] text-slate-500 tabular-nums">{fmt(combined)} household</p>
              </div>
            </div>
          </SectionCard>
        )}
      </div>
    </>
  );
}
