/**
 * Advisory savings-goal projections from "available for goals" (monthly ceiling).
 * Does not mutate monthly totals — planning layer only.
 */

const r2 = (n) => Math.round((n ?? 0) * 100) / 100;

/**
 * @param {number} availableForGoals — monthly ceiling from the monthly plan (max(0, baseLeftover − buffer))
 * @param {{
 *   targetAmount: number
 *   currentSavedAmount?: number
 *   chosenMonthlyContribution?: number
 *   committed?: boolean
 *   committedMonthlyContribution?: number
 * }} goal
 */
export function computeGoalDerived(availableForGoals, goal) {
  const cap = r2(Math.max(0, availableForGoals));
  const targetAmount = r2(Math.max(0, goal.targetAmount ?? 0));
  const currentSavedAmount = r2(Math.max(0, goal.currentSavedAmount ?? 0));
  const remainingAmount = Math.max(0, r2(targetAmount - currentSavedAmount));

  const recommendedMonthlyContribution = cap <= 0 ? 0 : cap;

  const chosenRaw = goal.chosenMonthlyContribution ?? 0;
  const chosenMonthlyContribution = r2(Math.max(0, chosenRaw));

  const committed = Boolean(goal.committed);
  const committedMonthly = r2(Math.max(0, goal.committedMonthlyContribution ?? 0));

  let effectiveMonthlyContribution;
  if (committed) {
    effectiveMonthlyContribution = committedMonthly;
  } else {
    effectiveMonthlyContribution =
      chosenMonthlyContribution > 0 ? chosenMonthlyContribution : recommendedMonthlyContribution;
  }

  let estimatedMonthsToGoal = null;
  if (remainingAmount <= 0) {
    estimatedMonthsToGoal = 0;
  } else if (effectiveMonthlyContribution > 0) {
    estimatedMonthsToGoal = Math.ceil(remainingAmount / effectiveMonthlyContribution);
  }

  // Committed amounts are fixed in the monthly plan; overcommit is surfaced globally (p1Remain < 0) in the UI.
  const isAffordable = committed ? true : effectiveMonthlyContribution <= cap;

  return {
    remainingAmount,
    recommendedMonthlyContribution,
    chosenMonthlyContribution,
    effectiveMonthlyContribution,
    estimatedMonthsToGoal,
    isAffordable,
    committed,
  };
}
