import { useRef } from 'react';
import NetWorthAssetCurrencyField from './NetWorthAssetCurrencyField';
import { formatCurrency } from '../utils/calculations';
import {
  computeNetWorthPresentationalState,
  formatCashShareBasisSubline,
  formatDebtRatioBasisSubline,
  formatDerivedPropertyEquityDisplay,
  formatEmergencyFundMonths,
  formatEmergencyFundMonthsBasisSubline,
  formatLiquidityRatioBasisSubline,
  formatNetWorthRatioAsPercent,
  formatPensionShareBasisSubline,
  formatPropertyShareBasisSubline,
  formatStocksAndSharesShareBasisSubline,
} from '../utils/netWorthSummary';
import { formatNetWorthLastUpdatedAt } from '../utils/netWorthStorage';
import { getLabel } from '../utils/fieldLabels';

const OTHER_ASSET_FIELDS = [
  { key: 'cash', labelKey: 'net_worth_asset_cash' },
  { key: 'stocksAndShares', labelKey: 'net_worth_asset_stocks_and_shares' },
  { key: 'pensionHoldings', labelKey: 'net_worth_asset_pension_holdings' },
];

const MANUAL_LIABILITY_FIELDS = [
  { key: 'loans', labelKey: 'net_worth_liability_loans' },
  { key: 'creditCards', labelKey: 'net_worth_liability_credit_cards' },
];

/**
 * Net worth tab — summary and asset inputs. Canonical state lives in `App.jsx`.
 *
 * @param {object} props
 * @param {{ assets: Record<string, number>, liabilities: Record<string, number> }} props.netWorthInputs
 * @param {number} props.derivedMortgageBalance — Budget mirror total; shown read-only (not `liabilities.mortgageBalance`)
 * @param {(assetKey: string, value: number) => void} props.onNetWorthAssetChange
 * @param {(liabilityKey: string, value: number) => void} props.onNetWorthLiabilityChange
 * @param {() => void} props.onResetNetWorth
 * @param {() => void} props.onExportNetWorth
 * @param {(file: File) => void | Promise<void>} props.onImportNetWorthFile
 * @param {string | null | undefined} props.importError
 * @param {number | null | undefined} props.lastUpdatedAtMs — local edit time (metadata only)
 * @param {string} props.persistenceStatusLabel — device/sync persistence line (from `deriveNetWorthStorageStatus` in App)
 * @param {{ totalAssets: number, totalLiabilities: number, netWorth: number, derivedPropertyEquity: number }} props.summary
 * @param {{ liquidAssets: number, totalLiabilities: number, netWorth: number, derivedPropertyEquity: number, liquidityRatio: number, debtRatio: number, pensionShareOfAssets: number, propertyShareOfAssets: number, cashShareOfAssets: number, stocksAndSharesShareOfAssets: number, emergencyFundMonths: number, essentialMonthlyCosts: number, pensionHoldings: number, cash: number, stocksAndShares: number }} props.insights
 */
export default function NetWorthTab({
  netWorthInputs,
  derivedMortgageBalance,
  onNetWorthAssetChange,
  onNetWorthLiabilityChange,
  onResetNetWorth,
  onExportNetWorth,
  onImportNetWorthFile,
  importError,
  lastUpdatedAtMs,
  persistenceStatusLabel,
  summary,
  insights,
}) {
  const importFileInputRef = useRef(null);
  const { totalAssets, totalLiabilities, netWorth: netWorthFigure, derivedPropertyEquity } = summary;
  const {
    liquidAssets,
    totalLiabilities: insightLiabilities,
    netWorth: insightNetWorth,
    liquidityRatio,
    debtRatio,
    pensionShareOfAssets,
    propertyShareOfAssets,
    cashShareOfAssets,
    stocksAndSharesShareOfAssets,
    emergencyFundMonths,
    essentialMonthlyCosts,
    pensionHoldings,
    cash: cashAmount,
    stocksAndShares: stocksAndSharesAmount,
  } = insights;
  const { assets, liabilities } = netWorthInputs;
  const { completedCount, totalCount, allInputsZero, totalAssetsZero } =
    computeNetWorthPresentationalState(netWorthInputs, totalAssets);
  const lastUpdatedStamp = formatNetWorthLastUpdatedAt(lastUpdatedAtMs);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 leading-snug">
        {completedCount} of {totalCount} {getLabel('net_worth_completeness_caption')}
      </p>
      <p className="text-xs text-slate-500 leading-snug">
        {getLabel('net_worth_last_updated_prefix')}{' '}
        {lastUpdatedStamp ?? getLabel('net_worth_last_updated_not_available')}
      </p>
      <p className="text-xs text-slate-500 leading-snug">{persistenceStatusLabel}</p>

      {/* --- Summary --- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Summary</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">{getLabel('net_worth_total_assets')}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {formatCurrency(totalAssets)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{getLabel('net_worth_total_liabilities')}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {formatCurrency(totalLiabilities)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{getLabel('net_worth_net_worth')}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {formatCurrency(netWorthFigure)}
            </p>
          </div>
        </div>
        {allInputsZero ? (
          <p className="mt-3 text-xs text-slate-500 leading-snug">{getLabel('net_worth_edge_no_values')}</p>
        ) : null}
      </div>

      {/* --- Assets --- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {getLabel('net_worth_section_assets')}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onExportNetWorth}
              className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
            >
              {getLabel('net_worth_export')}
            </button>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void onImportNetWorthFile(f);
              }}
            />
            <button
              type="button"
              onClick={() => importFileInputRef.current?.click()}
              className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
            >
              {getLabel('net_worth_import')}
            </button>
            <button
              type="button"
              onClick={onResetNetWorth}
              className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
            >
              {getLabel('net_worth_reset')}
            </button>
          </div>
        </div>
        {importError ? (
          <p className="mt-2 text-xs text-slate-600 leading-snug" role="status">
            {importError}
          </p>
        ) : null}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NetWorthAssetCurrencyField
            label={getLabel('net_worth_asset_property_value')}
            value={assets.propertyValue ?? 0}
            onChange={(raw) => onNetWorthAssetChange('propertyValue', raw)}
          />
          <div className="flex flex-col justify-end rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 sm:min-h-[4.25rem]">
            <p className="text-xs text-slate-500">{getLabel('net_worth_derived_property_equity')}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {formatDerivedPropertyEquityDisplay(derivedPropertyEquity)}
            </p>
            <p className="mt-1 text-xs text-slate-500 leading-snug">
              {getLabel('net_worth_derived_property_equity_basis')}
            </p>
          </div>
          {OTHER_ASSET_FIELDS.map(({ key, labelKey }) => (
            <NetWorthAssetCurrencyField
              key={key}
              label={getLabel(labelKey)}
              value={assets[key] ?? 0}
              onChange={(raw) => onNetWorthAssetChange(key, raw)}
            />
          ))}
        </div>
      </div>

      {/* --- Liabilities --- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {getLabel('net_worth_section_liabilities')}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div
            className="flex flex-col justify-end rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 sm:min-h-[4.25rem]"
            role="group"
            aria-label={`${getLabel('net_worth_liability_mortgage_from_budget')}, ${getLabel('net_worth_liability_mortgage_from_budget_basis')}`}
          >
            <p className="text-xs text-slate-500">{getLabel('net_worth_liability_mortgage_from_budget')}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {formatCurrency(derivedMortgageBalance ?? 0)}
            </p>
            <p className="mt-1 text-xs text-slate-500 leading-snug">
              {getLabel('net_worth_liability_mortgage_from_budget_basis')}
            </p>
          </div>
          {MANUAL_LIABILITY_FIELDS.map(({ key, labelKey }) => (
            <NetWorthAssetCurrencyField
              key={key}
              label={getLabel(labelKey)}
              value={liabilities[key] ?? 0}
              onChange={(raw) => onNetWorthLiabilityChange(key, raw)}
            />
          ))}
        </div>
      </div>

      {/* --- Insights --- */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {getLabel('net_worth_section_insights')}
        </p>
        {totalAssetsZero ? (
          <p className="mt-2 text-xs text-slate-500 leading-snug">{getLabel('net_worth_edge_ratio_basis')}</p>
        ) : null}
        <div className="mt-4 space-y-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {getLabel('net_worth_insight_group_overview')}
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">{getLabel('net_worth_net_worth')}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
                  {formatCurrency(insightNetWorth)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {getLabel('net_worth_insight_group_liquidity')}
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">{getLabel('net_worth_insight_liquid_assets')}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
                  {formatCurrency(liquidAssets)}
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-snug">
                  {getLabel('net_worth_insight_liquid_assets_basis')}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{getLabel('net_worth_insight_liquidity_ratio')}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
                  {formatNetWorthRatioAsPercent(liquidityRatio)}
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-snug">
                  {formatLiquidityRatioBasisSubline(liquidAssets, totalAssets)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{getLabel('net_worth_insight_emergency_fund_months')}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
                  {formatEmergencyFundMonths(emergencyFundMonths)}
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-snug">
                  {formatEmergencyFundMonthsBasisSubline(liquidAssets, essentialMonthlyCosts)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {getLabel('net_worth_insight_group_liabilities')}
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">{getLabel('net_worth_total_liabilities')}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
                  {formatCurrency(insightLiabilities)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{getLabel('net_worth_insight_debt_ratio')}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
                  {formatNetWorthRatioAsPercent(debtRatio)}
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-snug">
                  {formatDebtRatioBasisSubline(insightLiabilities, totalAssets)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {getLabel('net_worth_insight_group_asset_concentration')}
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">{getLabel('net_worth_insight_pension_share_of_assets')}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
                  {formatNetWorthRatioAsPercent(pensionShareOfAssets)}
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-snug">
                  {formatPensionShareBasisSubline(pensionHoldings, totalAssets)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{getLabel('net_worth_insight_property_share_of_assets')}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
                  {formatNetWorthRatioAsPercent(propertyShareOfAssets)}
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-snug">
                  {formatPropertyShareBasisSubline(assets.propertyValue ?? 0, totalAssets)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{getLabel('net_worth_insight_cash_share_of_assets')}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
                  {formatNetWorthRatioAsPercent(cashShareOfAssets)}
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-snug">
                  {formatCashShareBasisSubline(cashAmount, totalAssets)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{getLabel('net_worth_insight_stocks_and_shares_share_of_assets')}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
                  {formatNetWorthRatioAsPercent(stocksAndSharesShareOfAssets)}
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-snug">
                  {formatStocksAndSharesShareBasisSubline(stocksAndSharesAmount, totalAssets)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
