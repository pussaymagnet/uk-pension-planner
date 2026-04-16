import { formatCurrency } from '../utils/calculations';
import { getLabel } from '../utils/fieldLabels';
import { ProjectionAssetAttributionHover } from './ProjectionAssetAttributionHover.jsx';

/**
 * Presentational Projection tab — inputs, baseline facts, summary cards, yearly table.
 *
 * @param {object} props
 * @param {import('../utils/projectionSummary.js').ProjectionInputs} props.projectionInputs
 * @param {(field: string, value: number) => void} props.onProjectionChange
 * @param {{ annualPensionContribution: number, monthlyBudgetSavings: number, monthlyCashSavings: number, monthlyStockSavings: number }} props.baseline
 * @param {{
 *   rows: Array<object & { assetAttribution?: object }>,
 *   finalRow: object,
 *   attributionSummary?: object
 * }} props.projectionResult
 * @param {string} props.persistenceStatusLabel — device/sync line (same `deriveNetWorthStorageStatus` pattern as Net Worth in App)
 */
export default function ProjectionTab({
  projectionInputs,
  onProjectionChange,
  baseline,
  projectionResult,
  persistenceStatusLabel,
}) {
  const { rows, finalRow } = projectionResult;
  const finalByAsset = finalRow?.assetAttribution?.byAsset;

  const fieldClass =
    'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 tabular-nums';

  const assetCell = (value, byAsset, assetKey) => {
    const hasAttr = Boolean(byAsset?.[assetKey]);
    return (
      <td className="py-2 pr-3 tabular-nums">
        {hasAttr ? (
          <ProjectionAssetAttributionHover byAsset={byAsset} assetKey={assetKey}>
            {formatCurrency(value)}
          </ProjectionAssetAttributionHover>
        ) : (
          formatCurrency(value)
        )}
      </td>
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 leading-snug max-w-3xl">{getLabel('projection_intro')}</p>
      <p className="text-xs text-slate-500 leading-snug max-w-3xl">{getLabel('projection_hover_attribution_hint')}</p>
      <p className="text-xs text-slate-500 leading-snug">{persistenceStatusLabel}</p>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {getLabel('projection_section_inputs')}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="text-xs text-slate-500">{getLabel('projection_years')}</span>
            <input
              type="number"
              min={1}
              max={40}
              step={1}
              className={fieldClass}
              value={projectionInputs.projectionYears}
              onChange={(e) => onProjectionChange('projectionYears', Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">{getLabel('projection_pension_growth_pct')}</span>
            <input
              type="number"
              step={0.1}
              className={fieldClass}
              value={projectionInputs.pensionGrowthAnnualPct}
              onChange={(e) => onProjectionChange('pensionGrowthAnnualPct', Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">{getLabel('projection_investment_growth_pct')}</span>
            <input
              type="number"
              step={0.1}
              className={fieldClass}
              value={projectionInputs.investmentGrowthAnnualPct}
              onChange={(e) => onProjectionChange('investmentGrowthAnnualPct', Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">{getLabel('projection_cash_growth_pct')}</span>
            <input
              type="number"
              step={0.1}
              className={fieldClass}
              value={projectionInputs.cashGrowthAnnualPct}
              onChange={(e) => onProjectionChange('cashGrowthAnnualPct', Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">{getLabel('projection_contribution_escalation_pct')}</span>
            <input
              type="number"
              step={0.1}
              className={fieldClass}
              value={projectionInputs.contributionEscalationAnnualPct}
              onChange={(e) => onProjectionChange('contributionEscalationAnnualPct', Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">{getLabel('projection_inflation_pct')}</span>
            <input
              type="number"
              step={0.1}
              className={fieldClass}
              value={projectionInputs.inflationAnnualPct}
              onChange={(e) => onProjectionChange('inflationAnnualPct', Number(e.target.value))}
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500 leading-snug">Percent figures are nominal rates per year.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {getLabel('projection_section_baseline')}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs text-slate-500">{getLabel('projection_baseline_pension_contribution')}</p>
            <p className="mt-0.5 font-medium tabular-nums text-slate-900">
              {formatCurrency(baseline.annualPensionContribution)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{getLabel('projection_baseline_monthly_savings')}</p>
            <p className="mt-0.5 font-medium tabular-nums text-slate-900">
              {formatCurrency(baseline.monthlyBudgetSavings)}
              <span className="text-slate-500 font-normal"> {getLabel('slash_month')}</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-500 tabular-nums leading-snug">
              Cash {formatCurrency(baseline.monthlyCashSavings ?? 0)}
              <span className="text-slate-400"> · </span>
              Stocks {formatCurrency(baseline.monthlyStockSavings ?? 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {getLabel('projection_section_outputs')} ({finalRow?.yearIndex ?? 0})
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div>
            <p className="text-xs text-slate-500">{getLabel('projection_out_pension')}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
              <ProjectionAssetAttributionHover byAsset={finalByAsset} assetKey="pension">
                {formatCurrency(finalRow?.pension ?? 0)}
              </ProjectionAssetAttributionHover>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{getLabel('projection_out_investments')}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
              <ProjectionAssetAttributionHover byAsset={finalByAsset} assetKey="stocks">
                {formatCurrency(finalRow?.stocksAndShares ?? 0)}
              </ProjectionAssetAttributionHover>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{getLabel('projection_out_cash')}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
              <ProjectionAssetAttributionHover byAsset={finalByAsset} assetKey="cash">
                {formatCurrency(finalRow?.cash ?? 0)}
              </ProjectionAssetAttributionHover>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{getLabel('projection_table_property')}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
              <ProjectionAssetAttributionHover byAsset={finalByAsset} assetKey="property">
                {formatCurrency(finalRow?.propertyValue ?? 0)}
              </ProjectionAssetAttributionHover>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{getLabel('projection_out_net_worth')}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
              {formatCurrency(finalRow?.netWorth ?? 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {getLabel('projection_section_table')}
        </p>
        <table className="mt-3 w-full min-w-[720px] text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="py-2 pr-3 font-medium">{getLabel('projection_table_year')}</th>
              <th className="py-2 pr-3 font-medium tabular-nums">{getLabel('projection_table_pension')}</th>
              <th className="py-2 pr-3 font-medium tabular-nums">{getLabel('projection_table_stocks')}</th>
              <th className="py-2 pr-3 font-medium tabular-nums">{getLabel('projection_table_cash')}</th>
              <th className="py-2 pr-3 font-medium tabular-nums">{getLabel('projection_table_property')}</th>
              <th className="py-2 pr-3 font-medium tabular-nums">{getLabel('projection_table_liabilities')}</th>
              <th className="py-2 pr-3 font-medium tabular-nums">{getLabel('projection_table_total_assets')}</th>
              <th className="py-2 font-medium tabular-nums">{getLabel('projection_table_net_worth')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const ba = r.assetAttribution?.byAsset;
              return (
                <tr key={r.yearIndex} className="border-b border-slate-100 text-slate-800">
                  <td className="py-2 pr-3 tabular-nums">{r.yearIndex}</td>
                  {assetCell(r.pension, ba, 'pension')}
                  {assetCell(r.stocksAndShares, ba, 'stocks')}
                  {assetCell(r.cash, ba, 'cash')}
                  {assetCell(r.propertyValue, ba, 'property')}
                  <td className="py-2 pr-3 tabular-nums">{formatCurrency(r.totalLiabilities)}</td>
                  <td className="py-2 pr-3 tabular-nums">{formatCurrency(r.totalAssets)}</td>
                  <td className="py-2 tabular-nums font-medium">{formatCurrency(r.netWorth)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-xs text-slate-600 leading-relaxed">
        {getLabel('projection_assumptions_body')}
      </div>
    </div>
  );
}
