# Tab: Pension

**Role:** Primary UK income tax / NI / pension modelling for the current tax year; drives **take-home** used by Budget and **annual pension contribution** used by Projection.

## Architecture

- **State:** Owned in `App.jsx`: `inputs` (string fields for form), `contributionMode` (`percent` | `nominal`), `displayPeriod`, `taxRegion`.
- **Derivation:** `empPct` / `erPct` from inputs + mode → `calculateFullPosition(...)` → `position`.
- **UI:** `InputForm`, `PensionTaxPanel`, `PensionValueStackedBarChart`, `PensionBenefitBarChart`; optional audit JSON in a `<details>` block.
- **Output to rest of app:** `netMonthlyIncome = position.takeHome?.netTakeHomeMonthly ?? 0` passed to `BudgetFeature` (includes pre-tax share plan in PAYE base, post-tax share plan as a net deduction, and Plan 4 student loan when applicable — see `docs/logic-data-flow.md`).

## Persistence

- Key `pension-planner-inputs` (localStorage) mirrors inputs + `contributionMode`, `displayPeriod`, `taxRegion`.
- Logged-in: load from `pension_inputs`, debounced upsert on change (`App.jsx` effects).

## Key files

| File | Responsibility |
|------|----------------|
| `src/utils/calculations.js` | `calculateFullPosition`, NI, tax bands, sacrifice, allowance display helpers |
| `src/data/taxRules.js` | Bands, rates, `normalizeTaxRegion` |
| `src/components/InputForm.jsx` | Annual/monthly display scaling |
| `src/components/PensionTaxPanel.jsx` | Band narrative, SA relief display |

## Notes for maintainers

- Deeper formula and variable mapping: `docs/logic-data-flow.md` (Pension sections).
