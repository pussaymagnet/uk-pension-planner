# Tab: Budget

**Role:** Monthly cash-flow planning: household expenditures (including **mortgage** rows with rate/term metadata), debts, credit cards, planned savings, savings goals, unexpected buffer. Feeds other tabs via a **canonical localStorage mirror**, not by React context outside this feature.

## Architecture

- **Entry:** `BudgetFeature` → **`BudgetProvider`** (`features/budget/hooks/BudgetProvider.jsx`) — all state and handlers.
- **Props from shell:** `netMonthlyIncome` (from Pension take-home, including share plan and Plan 4 student loan when modelled), `user` (Supabase sync).
- **Domain:** `domain/expenditures.js`, `mortgageExpenditure.js`, `debt.js` (via `utils/debt.js` amortization), `goalDerived.js`, `goalRows.js`, `savingRows.js`, `plannedMonthlyOutgoings.js`.
- **Persistence:** `persistence/keys.js`, `persistence/budgetSync.js` (fetch bundle, row upserts/deletes).
- **UI sections:** `HouseholdCostsSection`, `DebtsSection`, `CreditCardsSection`, `PlannedSavingsSection`, `SavingsGoalsSection`, `BudgetHeader`, `BudgetSummaryPanel`, `BudgetSyncErrorBanner`.

## Cross-tab mirror (critical)

- **`plannedMonthlyOutgoings.js`** defines `BUDGET_MIRROR_STORAGE_KEY`, mirror **version 3**, and `computePlannedMonthlyOutgoings` + `syncBudgetMirrorToStorage`.
- App shell and Net Worth **read only** exported selectors (e.g. essential costs, monthly savings split, mortgage summary). Sign-out clears budget device keys via `clearBudgetLocalStorageForSignOut` imported in `App.jsx`.

## Mortgage

- Housing expenditure rows use category `housing_mortgage` with optional `mortgageBalance`, `mortgageAnnualRate`, `mortgageTermYears` (see `mortgageExpenditure.js`). Effective monthly amounts feed the mirror and projection-related aggregates.

## Key files

| File | Responsibility |
|------|----------------|
| `BudgetProvider.jsx` | State, validation, sync, mirror sync triggers |
| `plannedMonthlyOutgoings.js` | Mirror shape, migration, readers for App |
| `budgetSync.js` | Supabase API for budget entities |
