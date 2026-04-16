# Tab: Projection

**Role:** Long-horizon **projection** of wealth using user-editable growth/escalation assumptions. Does not own asset balances: it consumes a **snapshot** assembled in `App.jsx` from Pension + Net Worth + Budget mirror.

## Architecture

- **State:** `projectionInputs` in `App.jsx`, normalized via `utils/projectionDefaults.js` (`STORAGE_KEY_PROJECTION`). **Device:** `localStorage` mirror on every change (offline fallback). **Signed in:** `projection_inputs` in Supabase — fetch on login (`fetchProjectionInputsForUser` in `utils/projectionSupabase.js`); debounced upsert after `projectionLoadedForUserId === user.id` (same gate pattern as Net Worth). Persistence UI line reuses `deriveNetWorthStorageStatus` / `labelKeyForNetWorthStorageStatus` in `App.jsx`.
- **Snapshot:** `projectionSnapshot` `useMemo` in `App.jsx` includes:
  - Net worth asset fields (pension holdings, stocks, cash, property), liability totals and breakdown (mortgage, loans, cards),
  - `mortgageFromBudget` from `readMortgageSummaryFromBudgetMirror()`,
  - `annualPensionContribution` from pension `position.totalGrossAnnual`,
  - Monthly savings totals from budget mirror (aggregate, cash, stock).
- **Math:** `computeProjectionSeries(projectionInputs, projectionSnapshot)` in `utils/projectionSummary.js` → `projectionResult` passed to `ProjectionTab`.
- **Asset attribution:** Each yearly row includes `assetAttribution` with **totals** (`startingAssetsTotal`, `cumulativeContributions` with pension/stocks/cash + `total`, `cumulativeGrowth`) and **`byAsset`**: for pension, stocks, cash, and property — each has `starting`, `contributions`, `growth`, `ending` (matches row balances). Contributions follow the engine (pension / stock savings / cash savings); property contributions are 0. **Total growth** is the sum of per-asset growth (residual per bucket). Liabilities are not attributed.
- **Return shape:** `projectionResult` has `rows`, `finalRow`, and `attributionSummary` (same as `finalRow.assetAttribution`).
- **UI:** `ProjectionTab.jsx` — summary cards; per-asset table at horizon end; year-by-year table with per-asset cumulative contributions and growth columns.

## Key files

| File | Responsibility |
|------|----------------|
| `projectionSummary.js` | Year-by-year series |
| `projectionDefaults.js` | Normalization, initial load from storage |
| `projectionSupabase.js` | Fetch / upsert `projection_inputs` |

## Dependency note

Changing Net Worth keys, budget mirror shape, or pension contribution totals requires checking `projectionSnapshot` construction in `App.jsx` and updating this doc + `OVERALL_APP_FLOW.md`. Persistence behaviour is also summarised in `logic-data-flow.md`.
