# Budget feature

The Budget area is a **standalone monthly planning module**. It is implemented under `src/features/budget/` so it can be developed and reasoned about without touching pension, tax, or chart code.

## Public API

The app shell should only mount:

- `BudgetFeature` with props:
  - **`netMonthlyIncome`** — monthly take-home cash after tax, NI, and pension (computed once in `App.jsx`).
  - **`user`** — authenticated Supabase user or `null` for offline/local-only mode.

## Boundaries

- **Do not** import pension inputs, tax rules, `calculations.js`, or chart builders from this feature.
- **May** use shared pure helpers (e.g. `utils/debt.js` for loan maths, `utils/goalSavings.js` via `domain/goalDerived.js`).
- **Persistence**: all Supabase access to `budget_*` tables and localStorage keys lives under `persistence/`.

## Layout

| Path | Role |
|------|------|
| `BudgetFeature.jsx` | Entry component (thin wrapper around `BudgetProvider`) |
| `hooks/BudgetProvider.jsx` | State, sync, handlers, and main layout |
| `components/` | UI sections and shared primitives |
| `persistence/` | `keys.js`, `budgetSync.js` (no direct `supabase` usage in UI) |
| `domain/` | Row shapes, normalisers, re-exports of pure goal maths |
| `constants/copy.js` | User-visible strings for the feature |
