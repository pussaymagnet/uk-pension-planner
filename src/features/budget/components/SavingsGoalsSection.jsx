import { computeGoalDerived } from '../domain/goalDerived';
import { SectionCard, Label, EditIcon, DeleteIcon } from './BudgetPrimitives';

/**
 * Savings goals header, goal form, and goal cards (commit / derived stats).
 */
export function SavingsGoalsSection({
  availableForGoals,
  showGoalForm,
  editingGoalId,
  editingGoal,
  goalFormValues,
  goalErrors,
  handleGoalFormChange,
  saveGoalForm,
  cancelGoalForm,
  goalSavings,
  flashGoalId,
  openAddGoal,
  openEditGoal,
  deleteGoalEntry,
  commitGoal,
  uncommitGoal,
  fmt,
}) {
  return (
    <div className="pt-2">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Savings goals</h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600">
            Use your <span className="font-medium text-slate-700">available for goals</span> ({fmt(availableForGoals)}
            / month) as a guide. Mark a goal as included in your monthly plan to count it alongside planned savings.
          </p>
        </div>
        {!showGoalForm && (
          <button
            type="button"
            onClick={openAddGoal}
            className="shrink-0 rounded-full bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-900"
          >
            Add goal
          </button>
        )}
      </div>
      <SectionCard>

        {showGoalForm && (
          <div className="mb-4 p-4 rounded-xl bg-white border border-indigo-100 space-y-3">
            <p className="text-sm font-semibold text-slate-800">
              {editingGoalId ? 'Edit goal' : 'New goal'}
            </p>
            <div>
              <Label htmlFor="goal-name">Goal name</Label>
              <input
                id="goal-name"
                type="text"
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                  ${goalErrors.name ? 'border-red-400' : 'border-slate-300'}`}
                placeholder="e.g. Holiday, new laptop"
                value={goalFormValues.name}
                onChange={(e) => handleGoalFormChange('name', e.target.value)}
              />
              {goalErrors.name && <p className="text-xs text-red-500 mt-1">{goalErrors.name}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="goal-target">Target amount (£)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                  <input
                    id="goal-target"
                    type="number"
                    min="0.01"
                    step="0.01"
                    className={`w-full pl-7 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                      ${goalErrors.targetAmount ? 'border-red-400' : 'border-slate-300'}`}
                    value={goalFormValues.targetAmount}
                    onChange={(e) => handleGoalFormChange('targetAmount', e.target.value)}
                  />
                </div>
                {goalErrors.targetAmount && (
                  <p className="text-xs text-red-500 mt-1">{goalErrors.targetAmount}</p>
                )}
              </div>
              <div>
                <Label htmlFor="goal-current">Already saved (£) — optional</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                  <input
                    id="goal-current"
                    type="number"
                    min="0"
                    step="0.01"
                    className={`w-full pl-7 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                      ${goalErrors.currentSavedAmount ? 'border-red-400' : 'border-slate-300'}`}
                    placeholder="0"
                    value={goalFormValues.currentSavedAmount}
                    onChange={(e) => handleGoalFormChange('currentSavedAmount', e.target.value)}
                  />
                </div>
                {goalErrors.currentSavedAmount && (
                  <p className="text-xs text-red-500 mt-1">{goalErrors.currentSavedAmount}</p>
                )}
              </div>
              <div>
                <Label htmlFor="goal-chosen">Monthly contribution (£) — optional</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                  <input
                    id="goal-chosen"
                    type="number"
                    min="0"
                    step="0.01"
                    className={`w-full pl-7 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                      ${goalErrors.chosenMonthlyContribution ? 'border-red-400' : 'border-slate-300'}`}
                    placeholder={`Suggest: ${fmt(availableForGoals)}`}
                    value={goalFormValues.chosenMonthlyContribution}
                    onChange={(e) => handleGoalFormChange('chosenMonthlyContribution', e.target.value)}
                  />
                </div>
                {goalErrors.chosenMonthlyContribution && (
                  <p className="text-xs text-red-500 mt-1">{goalErrors.chosenMonthlyContribution}</p>
                )}
                <p className="text-[10px] text-slate-500 mt-1">
                  Leave blank to use the recommended standing order ({fmt(availableForGoals)}).
                </p>
              </div>
            </div>
            {editingGoal?.committed && (
              <div>
                <Label htmlFor="goal-committed-mo">Monthly contribution (£)</Label>
                <p className="text-[10px] text-slate-500 mb-1">
                  This amount is included in planned savings and reduces what’s left this month. Edit to change the
                  commitment.
                </p>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                  <input
                    id="goal-committed-mo"
                    type="number"
                    min="0"
                    step="0.01"
                    className={`w-full pl-7 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                      ${goalErrors.committedMonthlyContribution ? 'border-red-400' : 'border-slate-300'}`}
                    value={goalFormValues.committedMonthlyContribution}
                    onChange={(e) => handleGoalFormChange('committedMonthlyContribution', e.target.value)}
                  />
                </div>
                {goalErrors.committedMonthlyContribution && (
                  <p className="text-xs text-red-500 mt-1">{goalErrors.committedMonthlyContribution}</p>
                )}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={saveGoalForm}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl"
              >
                {editingGoalId ? 'Update' : 'Save'}
              </button>
              <button
                type="button"
                onClick={cancelGoalForm}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {goalSavings.length === 0 && !showGoalForm ? (
          <p className="text-sm text-slate-500 italic text-center py-2">
            No goals yet. Add one to see how long it could take with your current monthly plan.
          </p>
        ) : goalSavings.length > 0 ? (
          <div className="space-y-3">
            {goalSavings.map((g) => {
              const d = computeGoalDerived(availableForGoals, g);
              const canCommit =
                !g.committed &&
                (g.chosenMonthlyContribution > 0 || d.recommendedMonthlyContribution > 0);
              return (
                <div
                  key={g.id}
                  className={`rounded-xl border p-4 bg-white border-slate-200 ${
                    flashGoalId === g.id ? 'ring-2 ring-indigo-200' : ''
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{g.name || 'Goal'}</p>
                      <span
                        className={`inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${
                          g.committed
                            ? 'bg-violet-100 text-violet-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {g.committed ? 'Included in monthly plan' : 'Not included'}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label={`Edit ${g.name || 'goal'}`}
                        onClick={() => openEditGoal(g)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${g.name || 'goal'}`}
                        onClick={() => deleteGoalEntry(g.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded"
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {!g.committed && (
                      <button
                        type="button"
                        disabled={!canCommit}
                        title={
                          !canCommit
                            ? 'Set a monthly contribution or ensure available for goals is above zero'
                            : undefined
                        }
                        onClick={() => commitGoal(g)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700
                                   disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Include in monthly plan
                      </button>
                    )}
                    {g.committed && (
                      <button
                        type="button"
                        onClick={() => uncommitGoal(g)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700
                                   hover:bg-slate-50 transition-colors"
                      >
                        Remove from monthly plan
                      </button>
                    )}
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div className="flex justify-between sm:col-span-2 border-b border-slate-50 pb-1">
                      <dt className="text-slate-500">Remaining</dt>
                      <dd className="font-medium text-slate-800 tabular-nums">{fmt(d.remainingAmount)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Recommended standing order</dt>
                      <dd className="font-medium text-indigo-700 tabular-nums">
                        {fmt(d.recommendedMonthlyContribution)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Chosen monthly contribution</dt>
                      <dd className="font-medium text-slate-800 tabular-nums">
                        {g.chosenMonthlyContribution > 0 ? fmt(g.chosenMonthlyContribution) : '— (use recommended)'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Effective monthly</dt>
                      <dd className="font-semibold text-slate-900 tabular-nums">
                        {fmt(d.effectiveMonthlyContribution)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Est. months to target</dt>
                      <dd className="font-medium text-slate-800 tabular-nums">
                        {d.remainingAmount <= 0
                          ? '0 (reached)'
                          : d.estimatedMonthsToGoal != null
                            ? `${d.estimatedMonthsToGoal} mo`
                            : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between sm:col-span-2">
                      <dt className="text-slate-500">Affordability</dt>
                      <dd>
                        {g.committed ? (
                          <span className="text-violet-800 font-medium">Included in planned savings</span>
                        ) : d.isAffordable ? (
                          <span className="text-emerald-700 font-medium">Within plan</span>
                        ) : (
                          <span className="text-amber-800 font-medium">
                            Over plan vs available for goals
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
