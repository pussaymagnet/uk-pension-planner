const r2 = (n) => Math.round((n ?? 0) * 100) / 100;

export function normalizeGoalSavingRow(g) {
  return {
    id: String(g.id),
    name: g.name ?? '',
    targetAmount: r2(Number(g.targetAmount ?? 0)),
    currentSavedAmount: r2(Number(g.currentSavedAmount ?? 0)),
    chosenMonthlyContribution: r2(Number(g.chosenMonthlyContribution ?? 0)),
    committed: Boolean(g.committed),
    committedMonthlyContribution: r2(Number(g.committedMonthlyContribution ?? 0)),
  };
}
