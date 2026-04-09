# Logic and data-flow reference (UK Pension Planner)

This document maps **logic only** (not UI/styling): inputs, state, persistence, formulas, and outputs.

## Global inputs and orchestration

**State** (`src/App.jsx`): `inputs` (`grossSalary`, `employeeValue`, `employerValue`, `personalPensionNet`, `sharePlanContribution`, `sharePlanType` as strings), `contributionMode` (`percent` | `nominal`), `displayPeriod` (`annual` | `monthly`), `taxRegion` (`england` | `scotland`).

**Derived percentages** (same file): If `contributionMode === 'percent'`, `empPct` / `erPct` are the string inputs; else `nominalToPercent` (`src/utils/calculations.js`) converts £ annual amounts to % of `grossSalary`.

**Master calculation**: `calculateFullPosition(grossSalary, empPct, erPct, personalPensionNet, taxRegion, sharePlanContribution, sharePlanType)` (`src/utils/calculations.js`) returns `position`; components read nested fields. Share plan is optional (defaults: `0`, `post_tax`).

**Persistence**: `localStorage` key `pension-planner-inputs`; if signed in, Supabase table `pension_inputs` (load on login, debounced upsert on change). `normalizeTaxRegion` (`src/data/taxRules.js`) forces non-`scotland` to `england`.

**Important modelling note**: Income tax in `_incomeTaxAndNI` (`src/utils/calculations.js`) uses band tables from `getIncomeTaxRules` (`src/data/taxRules.js`) but **does not** apply the personal allowance taper for income above £100k (bands include a 0% personal allowance slice; no £1-per-£2 withdrawal). Reported take-home can therefore diverge from HMRC for salaries above £100k.

---

## FEATURE: Tax year label (header)

**SOURCE**: `position.currentYear` from `TAX_RULES.currentYear` (`src/data/taxRules.js`), returned by `calculateFullPosition`.

**FLOW**: Constant string pass-through; no arithmetic.

**VARIABLES**: `currentYear` → display only.

---

## FEATURE: Input fields (Your Details)

**SOURCE**: User typing; stored as strings in `inputs`. Optional display scaling in `InputForm` (`src/components/InputForm.jsx`).

**FLOW**:

1. **Annual vs monthly display**: For `grossSalary`, `personalPensionNet`, `sharePlanContribution`, and (in nominal mode) `employeeValue` / `employerValue`, `annualToDisplay` divides stored annual values by 12 when `displayPeriod === 'monthly'`. `fromDisplay` multiplies by 12 on change before calling `onChange`.
2. **Mode toggle** (`App.jsx` `handleModeToggle`): When switching to `nominal`, `percentToNominal`: `round((pct/100) * salary)`. When switching to `percent`, `nominalToPercent`: `round((amount/salary)*10000)/100`.
3. **Higher-band guide** (under Personal Pension when applicable): `remainingPensionNeeded` from `position.pensionBandImpact.remainingNeeded` (`calculateDynamicTaxBand`). It equals `calculateAdjustedIncomeAndPension(...).required_net_pension_contribution` — total net relief-at-source pension that would bring income to just below the pre–higher-rate limit **from a baseline of £0 personal pension**. It does **not** subtract the current personal pension input, so the figure does not jump while the user edits that field (it still updates with salary, sacrifice, and pre-tax share plan).

**FORMULA**:

- `nominalToPercent`: pct = round((amount / salary) × 100) to 2 dp
- `percentToNominal`: amount = round((pct / 100) × salary)

**VARIABLES**: `inputs.*` → canonical stored values (annual £ or % depending on field and mode).

---

## FEATURE: Tax band panel (`PensionTaxPanel`)

**SOURCE**: `position.taxBand`, `position.updatedAdjustedIncome`, `position.takeHome`, `position.personalPension.saRelief`, `position.pensionBandImpact` (band before personal pension, dropped band), `position.personalPensionNet`.

**FLOW**:

1. `calculateFullPosition` → `calculateDynamicTaxBand`: `gross_pension = net / 0.8`; `share_plan_deduction` applies only if `sharePlanType === 'pre_tax'`; `income_before_personal_pension = gross − sacrificeGross − share_plan_deduction` (floored at 0); `adjusted_income = income_before_personal_pension − gross_pension` (floored at 0).
2. `getTaxBand(adjusted_income, region)`: Walks `getIncomeTaxRules(region).bands` and returns `band.name` for the **adjusted** income stack (sacrifice + relief-at-source gross pension + pre-tax share plan).
3. UI: headline row (rate, band name, adjusted income, net take-home) on the coloured card; **More detail** expands band prose, optional pension-band note, and Self Assessment reclaim amount (`saRelief`) when that value is positive. Static copy (rate %, summary text) keyed by band name (`ENGLAND_CONFIG` / `SCOTLAND_CONFIG` in `PensionTaxPanel.jsx`).
4. Self Assessment extra relief on personal pension — see Personal Pension feature (`calculateSelfAssessmentRelief`).

**FORMULA**: **Pre-tax** share plan (e.g. SIP via salary sacrifice) reduces the same income stack as sacrifice. **Post-tax** share plan: `share_plan_deduction = 0` (no effect on taxable income in this model).

**VARIABLES**: `taxBand`, `grossSalary` (hides panel if falsy), `reliefAtSourceExtraSaRelief` (`saRelief` for display).

---

## FEATURE: Salary sacrifice block (`position.sacrifice`)

**SOURCE**: `position.sacrifice` from `calculateSacrificeContribution` (`src/utils/calculations.js`).

**FLOW**:

1. `sacrificeGross = round((pct/100) * salary)`; `salaryReduced = salary - sacrificeGross`.
2. `_incomeTaxAndNI(salary)` and `_incomeTaxAndNI(salaryReduced)`:
   - **Income tax**: For each band in `getIncomeTaxRules(region).bands` with `rate > 0`, `taxableInBand = min(salary, band.max) - (band.min - 1)`, add `taxableInBand * rate / 100`.
   - **NI (Class 1 primary)**: From `TAX_RULES.nationalInsurance`: `pt`, `uel`, `mainRate` (8%), `upperRate` (2%). If `salary > pt`: `(min(salary, uel) - pt) * mainRate/100`; if `salary > uel`: `(salary - uel) * upperRate/100`.
3. `incomeTaxSaving = round(itFull - itReduced)`; `niSaving = round(niFull - niReduced)`; `totalTaxSaving = incomeTaxSaving + niSaving`; `netCostAnnual = round(sacrificeGross - totalTaxSaving)`; `netCostMonthly = netCostAnnual/12`; `monthlyGross = sacrificeGross/12`.

**FORMULA**: Net cost of sacrifice = gross sacrificed minus income tax and NI savings vs not sacrificing.

**VARIABLES**: `sacrifice.sacrificeGross`, `.incomeTaxSaving`, `.niSaving`, `.netCostAnnual`, `.monthlyGross`; `employeeSacrificePct`.

---

## FEATURE: Personal pension (relief at source) (`position.personalPension`)

**SOURCE**: `position.personalPension` from `calculatePersonalPensionCost` (`src/utils/calculations.js`).

**FLOW**:

1. `multiplier = TAX_RULES.pension.taxRelief.reliefAtSourceMultiplier` (0.8).
2. `grossPension = round(netPaid / 0.8)`; `basicRelief = round(grossPension - netPaid)` (20% of gross).
3. `getReliefAtSourceExtraSaRelief(effectiveSalary, grossPension, region)`: Sort bands by `min`; for each band with `rate > 20`, allocate up to `remaining` gross pension to overlap between taxable income in that band and the contribution; add relief `(take * (band.rate - 20)) / 100`. Returns `saRelief`; `saReliefExtraPct = round((saRelief / grossPension) * 100)` if `grossPension > 0`.
4. `effectiveCost = round(netPaid - saRelief)`; `monthlyNetPaid = netPaid/12`.

**FORMULA**: Gross from net: G = N / 0.8. Extra SA relief models higher/additional rate relief above 20% on the grossed-up amount, capped by income in those bands.

**VARIABLES**: `personalPension.grossPension`, `.basicRelief`, `.saRelief`, `.saReliefExtraPct`, `.netPaid`.

---

## FEATURE: Share plan (pre-tax / post-tax)

**SOURCE**: `inputs.sharePlanContribution` (annual £ string), `inputs.sharePlanType` (`pre_tax` | `post_tax`).

**FLOW**:

1. `getSharePlanDeduction(contribution, type)`: if `pre_tax`, `round2(max(0, contribution))`; if `post_tax`, `0`.
2. Fed into `calculateDynamicTaxBand`, `calculateAdjustedIncomeAndPension` (higher-rate guide), and `calculateSelfAssessmentRelief` via `calculateFullPosition` so tax band, pension threshold guide, and SA relief stay consistent.
3. `calculateAdjustedIncomeParts` (pure helper) documents the deduction list: salary sacrifice, gross pension, share plan (pre-tax only); `adjusted_income = gross − sum(deductions)` (min 0).

**FORMULA**: `share_plan_deduction_applied = pre_tax ? contribution : 0`; `updated_adjusted_income` is the same figure as `pensionBandImpact.adjustedIncome` / `position.updatedAdjustedIncome`.

**VARIABLES**: `position.sharePlanContribution`, `sharePlanType`, `sharePlanDeductionApplied`, `updatedAdjustedIncome`; `pensionBandImpact.incomeBeforePersonalPension`, `sharePlanDeductionApplied`.

---

## FEATURE: Employer contribution (`position` employer gross fields)

**SOURCE**: `position.employerGrossAnnual`, `position.employerGrossMonthly`, `employerPercent`.

**FLOW** (`calculateFullPosition`): `employerGrossAnnual = round((erPct/100) * salary)`; `employerGrossMonthly = employerGrossAnnual / 12`.

**FORMULA**: employer = round((erPct / 100) × salary).

---

## FEATURE: Combined total into pension (`position.totalGross*`, `totalCombinedPct`)

**SOURCE**: `position.totalGrossAnnual`, `position.totalGrossMonthly`, `position.totalCombinedPct`.

**FLOW**: `totalGrossAnnual = round(sacrificeGross + personalPension.grossPension + employerGrossAnnual)`; `totalGrossMonthly = totalGrossAnnual/12`; `ppGrossPct = salary > 0 ? round((personalPension.grossPension / salary)*100) : 0`; `totalCombinedPct = round(sacPct + erPct + ppGrossPct)`.

**FORMULA**: Combined % = employee sacrifice % + employer % + (personal pension gross as % of salary).

---

## FEATURE: Annual allowance (`position.allowance`)

**SOURCE**: `position.allowance` from `calculateRemainingAllowance` (`src/utils/calculations.js`).

**FLOW**:

1. `maxAllowance = TAX_RULES.pension.annualAllowance.standard` (60000); `effectiveMax = min(maxAllowance, salary)`.
2. `sacrificeGross`, `employerGross` as above; `personalPensionGross = round(ppNet / 0.8)`.
3. `usedAllowance = sacrificeGross + employerGross + personalPensionGross`; `remainingAllowance = effectiveMax - usedAllowance`; `percentUsed = min(100, (usedAllowance/effectiveMax)*100)` (0 if `effectiveMax` is 0).
4. `warning` strings if total > salary (tax relief cap message), or exceeding AA, or ≥90% usage.

**FORMULA**: Used = sacrifice gross + employer gross + personal pension gross (relief-at-source gross).

**VARIABLES**: `maxAllowance`, `usedAllowance`, `remainingAllowance`, `percentUsed`, `isExceeding`, `warning`, `sacrificeGross`, `employerGross`.

---

## FEATURE: Contribution target (15%) (`position.recommendation`)

**SOURCE**: `position.recommendation` from `calculateRecommendation` (`src/utils/calculations.js`).

**FLOW**:

1. `target = TAX_RULES.pension.recommendation.minimumTotalPercentage` (15).
2. `ppGrossAnnual = round(ppNet / 0.8)`; `ppGrossPct = salary > 0 ? round((ppGrossAnnual/salary)*100) : 0`.
3. `currentTotal = round(sacPct + erPct + ppGrossPct)`; `meetsTarget = currentTotal >= target`.
4. If below target: `shortfallPercent = target - currentTotal`; `shortfallGrossAnnual = (shortfallPercent/100) * salary`; `monthlyNetNeeded = round((shortfallGrossAnnual * 0.8) / 12)` (net monthly to pay under relief-at-source).
5. `additionalReliefAnnual = calculateSelfAssessmentRelief(..., sharePlanOptions).self_assessment_relief`; message string built in calculator.

**FORMULA**: Target compares **sum of percentages**: sacrifice % + employer % + (personal pension gross / salary × 100).

**VARIABLES**: `meetsTarget`, `currentTotal`, `target`, `shortfallPercent`, `monthlyNetNeeded`, `additionalReliefAnnual`, `message`, etc.

---

## FEATURE: Estimated take-home pay (`position.takeHome`, `PensionTaxPanel`)

**SOURCE**: `position.takeHome` from `calculateTakeHome` (`src/utils/calculations.js`).

**FLOW**:

1. `sacrificeGross = round((sacPct/100)*salary)`; `salaryForTax = salary - sacrificeGross`.
2. `[incomeTax, ni] = _incomeTaxAndNI(salaryForTax, region)`.
3. `grossTakeHome = round(salaryForTax - incomeTax - ni)`; `netTakeHome = round(grossTakeHome - ppNet)`; monthly = annual / 12.

**FORMULA**: Net after all pension = take-home after tax/NI on reduced salary, minus **net** personal pension payment (salary sacrifice already embedded in tax/NI).

**VARIABLES**: `estimatedIncomeTax`, `estimatedNI`, `grossTakeHomeAnnual`/`Monthly`, `netTakeHomeAnnual`/`Monthly`, `sacrificeGross`, `personalPensionNet`.

---

## FEATURE: Budget tab — net monthly income (right column)

**SOURCE**: `netMonthlyIncome` prop from `App.jsx`: `position.takeHome?.netTakeHomeMonthly ?? 0`.

**FLOW**: Same as take-home monthly above.

---

## FEATURE: Budget — expenditure rows and subtotals (`BudgetTab`)

**SOURCE**: `expenditures[]` from state; loaded from Supabase `budget_expenditures` or `localStorage` key `pension-planner-budget`; defaults from `createDefaultExpenditures` (`src/components/budgetConstants.js`).

**FLOW**:

1. Per row: `p1Amount(exp) = round((exp.partner1Pct / 100) * exp.amount)`.
2. `p1Total = round(sum of p1Amount)`; `combined = round(sum of exp.amount)`.
3. Section filters: `section === SECTION_FIXED` / `SECTION_NICE`; `fixedCombined`, `fixedP1Total`, `niceCombined`, `niceP1Total` = sums within section.

**FORMULA**: Partner 1 share of household line = `amount × (partner1Pct / 100)`.

**VARIABLES**: `exp.amount`, `exp.partner1Pct`, `p1Amount`, `p1Total`, `combined`, section subtotals.

---

## FEATURE: Budget — debt monthly payment and interest over term (`BudgetTab` + `debt.js`)

**SOURCE**: `debts[]` with `principal`, `annualRatePct`, `termMonths`.

**FLOW**:

1. `calculateAmortizingMonthlyPayment(P, apr, n)` (`src/utils/debt.js`): If `apr === 0`, `P/n`; else `r = (apr/100)/12`, payment = (P × r × (1+r)^n) / ((1+r)^n − 1), rounded to 2 dp.
2. `calculateTotalInterest(principal, monthlyPayment, termMonths)`: `max(0, round((m * n - P) * 100) / 100)`.
3. `debtMonthlyTotal = round(sum of debtMonthly(d))`.

**FORMULA**: Standard amortizing loan, monthly compounding.

**VARIABLES**: `d.principal`, `d.annualRatePct`, `d.termMonths`, `dm`, `interestTotal` per row.

---

## FEATURE: Budget — monthly savings total (`BudgetTab`)

**SOURCE**: `savings[]` with `amount` per line.

**FLOW**: `savingsTotal = round(sum of v.amount)`.

---

## FEATURE: Budget — committed total and remaining (`BudgetTab`)

**FLOW**:

1. `p1CommittedTotal = round(p1Total + debtMonthlyTotal + savingsTotal)`.
2. `p1Remain = round(netMonthlyIncome - p1Total - debtMonthlyTotal - savingsTotal)`.

**FORMULA**: Remaining = net monthly income from pension planner minus Partner 1 share of bills, total debt payments, and total monthly savings.

**VARIABLES**: `netMonthlyIncome`, `p1Total`, `debtMonthlyTotal`, `savingsTotal`, `p1Remain`.

**Note**: `combined` expenditure is household total; “My committed spend” uses **p1Total** (Partner 1’s share only). Debt and savings are **not** split by partner % in code (full amounts deducted from Partner 1’s remaining).

---

## FEATURE: Auth / sync (non-numeric)

**SOURCE**: `useUser` (`src/hooks/useUser.js`) → Supabase session `user.email`. Budget/pension sync flags and errors are string state, not calculated.

---

## Final summary diagram (ASCII)

```text
[User inputs: grossSalary, employeeValue, employerValue, personalPensionNet]
        |
        v
[App: contributionMode, percent/nominal conversion (nominalToPercent / percentToNominal)]
        |
        v
[calculateFullPosition]  <-- taxRegion, TAX_RULES (taxRules.js)
        |
        +-- _incomeTaxAndNI(salary)  --> income tax (band loop) + NI (PT/UEL rates)
        |
        +-- getTaxBand(effectiveSalary)
        +-- calculateSacrificeContribution  --> sacrifice.* (tax/NI savings)
        +-- calculatePersonalPensionCost  --> gross = net/0.8, getReliefAtSourceExtraSaRelief
        +-- calculateRemainingAllowance  --> AA used/remaining
        +-- calculateRecommendation  --> 15% target, shortfall, monthlyNetNeeded
        +-- calculateTakeHome  --> netTakeHomeMonthly (Budget input)
        |
        v
[Pension UI: InputForm, PensionTaxPanel]
        |
        v
[BudgetTab: netMonthlyIncome prop]
        |
        +-- expenditures (p1Amount, p1Total, section subtotals)
        +-- debts -> calculateAmortizingMonthlyPayment, calculateTotalInterest
        +-- savings -> savingsTotal
        +-- p1Remain = netMonthlyIncome - p1Total - debtMonthlyTotal - savingsTotal
```

**Persistence side channels** (do not change formulas): `localStorage` mirror; Supabase `pension_inputs`, `budget_expenditures`, `budget_debts`, `budget_savings` when `user` is set.

---

## Files index (logic)

| Area | File |
|------|------|
| Tax constants and band tables | `src/data/taxRules.js` |
| All pension/tax math | `src/utils/calculations.js` |
| Loan formulas | `src/utils/debt.js` |
| Budget defaults / row shape | `src/components/budgetConstants.js` |
| Orchestration + `position` | `src/App.jsx` |
| Input annual/monthly conversion | `src/components/InputForm.jsx` |
| Tax band + headline metrics + expandable detail | `src/components/PensionTaxPanel.jsx` |
| Budget aggregations | `src/components/BudgetTab.jsx` |
