import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  calculateFullPosition,
  getPensionBenefitBreakdown,
  nominalToPercent,
  percentToNominal,
  STUDENT_LOAN_PLAN_4,
} from './utils/calculations';
import { buildPensionBenefitChartData } from './utils/pensionBenefitChart';
import { buildPensionValueStackedChartData } from './utils/pensionValueStackedChart';
import { normalizeTaxRegion } from './data/taxRules';
import InputForm from './components/InputForm';
import PensionTaxPanel from './features/pension/components/PensionTaxPanel';
import PensionBenefitBarChart from './components/PensionBenefitBarChart';
import PensionValueStackedBarChart from './components/PensionValueStackedBarChart';
import BudgetFeature from './features/budget/BudgetFeature';
import NetWorthTab from './components/NetWorthTab';
import ProjectionTab from './components/ProjectionTab';
import AuthModal from './components/AuthModal';
import { useUser } from './hooks/useUser';
import { supabase } from './lib/supabase';
import { getLabel } from './utils/fieldLabels';
import {
  clearBudgetLocalStorageForSignOut,
  readEssentialMonthlyCostsFromBudgetMirror,
  readMonthlySavingsFromBudgetMirror,
  readMonthlyCashSavingsFromBudgetMirror,
  readMonthlyStockSavingsFromBudgetMirror,
  readMortgageSummaryFromBudgetMirror,
} from './features/budget/domain/plannedMonthlyOutgoings';
import { computeNetWorthSummary, computeNetWorthInsights, safeMoney } from './utils/netWorthSummary';
import { computeProjectionSeries } from './utils/projectionSummary';
import {
  loadProjectionInputsFromStorage,
  normalizeProjectionInputs,
  STORAGE_KEY_PROJECTION,
} from './utils/projectionDefaults';
import {
  getDefaultNetWorthInputs,
  normalizeNetWorthInputs,
  parseNetWorthImportJsonText,
} from './utils/netWorthStorage';
import { netWorthLocalPersistenceAdapter } from './utils/netWorthPersistenceAdapter';
import {
  deriveNetWorthStorageStatus,
  isSupabaseEnvConfiguredForNetWorth,
  labelKeyForNetWorthStorageStatus,
} from './utils/netWorthPersistenceStatus';
import { fetchNetWorthBundleForUser, upsertNetWorthBundleForUser } from './utils/netWorthSupabase';
import { fetchProjectionInputsForUser, upsertProjectionInputsForUser } from './utils/projectionSupabase';

// ─── constants ────────────────────────────────────────────────────────────────

const DEFAULT_INPUTS = {
  grossSalary:            '',
  bonusIncome:            '',
  benefitInKindTaxable:   '',
  employeeValue:          '',
  employerValue:          '',
  personalPensionNet:     '',
  sharePlanContribution:  '',
  sharePlanType:          'post_tax',
  /** '' | 'plan_4' — Scottish Plan 4 student loan; only affects calculations when tax region is Scotland */
  studentLoanPlan:        '',
};

const STORAGE_KEY_PENSION = 'pension-planner-inputs';

// ─── helpers ──────────────────────────────────────────────────────────────────

const PeriodToggle = ({ displayPeriod, onToggle }) => (
  <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 gap-0.5">
    {[
      { id: 'annual',  labelKey: 'display_period_annual' },
      { id: 'monthly', labelKey: 'display_period_monthly' },
    ].map(({ id, labelKey }) => (
      <button
        key={id}
        type="button"
        onClick={() => onToggle(id)}
        className={`px-3 py-1 rounded-md text-xs font-medium transition-all
          ${displayPeriod === id
            ? 'bg-white shadow-sm text-slate-900'
            : 'text-slate-500 hover:text-slate-700'}`}
      >
        {getLabel(labelKey)}
      </button>
    ))}
  </div>
);

const TaxRegionToggle = ({ taxRegion, onToggle }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs text-slate-600">{getLabel('tax_region')}</span>
    <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 gap-0.5">
      {[
        { id: 'england',  labelKey: 'tax_region_england' },
        { id: 'scotland', labelKey: 'tax_region_scotland' },
      ].map(({ id, labelKey }) => (
        <button
          key={id}
          type="button"
          onClick={() => onToggle(id)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all
            ${taxRegion === id
              ? 'bg-white shadow-sm text-slate-900'
              : 'text-slate-500 hover:text-slate-700'}`}
        >
          {getLabel(labelKey)}
        </button>
      ))}
    </div>
  </div>
);

// ─── main component ───────────────────────────────────────────────────────────

export default function App() {
  const { user, loading: authLoading } = useUser();

  const [inputs, setInputs]                 = useState(DEFAULT_INPUTS);
  const [contributionMode, setContributionMode] = useState('percent');
  const [displayPeriod, setDisplayPeriod]   = useState('annual');
  const [taxRegion, setTaxRegion]           = useState('england');
  const [activeTab, setActiveTab]           = useState('pension');
  const [showAuthModal, setShowAuthModal]   = useState(false);
  const [projectionInputs, setProjectionInputs] = useState(() => loadProjectionInputsFromStorage());
  /** When this matches `user.id`, remote row has been loaded (or attempt finished); enables debounced cloud upsert. */
  const [projectionLoadedForUserId, setProjectionLoadedForUserId] = useState(null);
  const [projectionRemoteFetchFailed, setProjectionRemoteFetchFailed] = useState(false);
  const [projectionRemoteUpsertFailed, setProjectionRemoteUpsertFailed] = useState(false);

  // Net Worth — canonical `netWorthInputs`, `lastUpdatedAtMs` metadata, tab-only `netWorthImportError`.
  // Derived: `netWorthSummary` / `netWorthInsights`. Device mirror: `netWorthLocalPersistenceAdapter`.
  // Signed-in: `net_worth_inputs` via `fetchNetWorthBundleForUser` / debounced `upsertNetWorthBundleForUser`.
  // Persistence UI status: `deriveNetWorthStorageStatus` (not inputs, not summary maths).
  const netWorthInitial = useMemo(() => netWorthLocalPersistenceAdapter.load(), []);
  const [netWorthInputs, setNetWorthInputs] = useState(() => netWorthInitial.inputs);
  const [netWorthLastUpdatedAtMs, setNetWorthLastUpdatedAtMs] = useState(
    () => netWorthInitial.lastUpdatedAtMs,
  );
  const [netWorthImportError, setNetWorthImportError] = useState(null);
  /** When this matches `user.id`, remote row has been loaded (or attempt finished); enables debounced cloud upsert. */
  const [netWorthLoadedForUserId, setNetWorthLoadedForUserId] = useState(null);
  const [netWorthRemoteFetchFailed, setNetWorthRemoteFetchFailed] = useState(false);
  const [netWorthRemoteUpsertFailed, setNetWorthRemoteUpsertFailed] = useState(false);

  /** Budget mirror mortgage liability for Net Worth (single source; not from `netWorthInputs.liabilities.mortgageBalance`). */
  const derivedMortgageBalance = useMemo(() => {
    const m = readMortgageSummaryFromBudgetMirror();
    if (!m.enabled) return 0;
    return safeMoney(m.totalBalance);
  }, [activeTab, netWorthInputs]);

  const netWorthSummary = useMemo(
    () => computeNetWorthSummary(netWorthInputs.assets, netWorthInputs.liabilities, derivedMortgageBalance),
    [netWorthInputs.assets, netWorthInputs.liabilities, derivedMortgageBalance],
  );

  const essentialMonthlyCosts = useMemo(
    () => readEssentialMonthlyCostsFromBudgetMirror(),
    [activeTab, netWorthInputs],
  );

  const monthlyBudgetSavings = useMemo(
    () => readMonthlySavingsFromBudgetMirror(),
    [activeTab, netWorthInputs],
  );

  const monthlyCashBudgetSavings = useMemo(
    () => readMonthlyCashSavingsFromBudgetMirror(),
    [activeTab, netWorthInputs],
  );

  const monthlyStockBudgetSavings = useMemo(
    () => readMonthlyStockSavingsFromBudgetMirror(),
    [activeTab, netWorthInputs],
  );

  const netWorthInsights = useMemo(
    () =>
      computeNetWorthInsights(netWorthInputs.assets, netWorthInputs.liabilities, {
        essentialMonthlyCosts,
        derivedMortgageBalance,
      }),
    [netWorthInputs.assets, netWorthInputs.liabilities, essentialMonthlyCosts, derivedMortgageBalance],
  );

  const netWorthPersistenceStatusLabel = useMemo(() => {
    const status = deriveNetWorthStorageStatus({
      hasUser: Boolean(user),
      supabaseConfigured: isSupabaseEnvConfiguredForNetWorth(),
      remoteLoadReady: Boolean(user && netWorthLoadedForUserId === user.id),
      remoteFetchFailed: netWorthRemoteFetchFailed,
      remoteUpsertFailed: netWorthRemoteUpsertFailed,
    });
    return getLabel(labelKeyForNetWorthStorageStatus(status));
  }, [
    user,
    netWorthLoadedForUserId,
    netWorthRemoteFetchFailed,
    netWorthRemoteUpsertFailed,
  ]);

  const projectionPersistenceStatusLabel = useMemo(() => {
    const status = deriveNetWorthStorageStatus({
      hasUser: Boolean(user),
      supabaseConfigured: isSupabaseEnvConfiguredForNetWorth(),
      remoteLoadReady: Boolean(user && projectionLoadedForUserId === user.id),
      remoteFetchFailed: projectionRemoteFetchFailed,
      remoteUpsertFailed: projectionRemoteUpsertFailed,
    });
    return getLabel(labelKeyForNetWorthStorageStatus(status));
  }, [
    user,
    projectionLoadedForUserId,
    projectionRemoteFetchFailed,
    projectionRemoteUpsertFailed,
  ]);

  const handleNetWorthAssetChange = useCallback((assetKey, committed) => {
    const value = safeMoney(committed);
    setNetWorthLastUpdatedAtMs(Date.now());
    setNetWorthInputs((prev) => ({
      ...prev,
      assets: { ...prev.assets, [assetKey]: value },
    }));
  }, []);

  const handleNetWorthLiabilityChange = useCallback((liabilityKey, committed) => {
    if (liabilityKey === 'mortgageBalance') return;
    const value = safeMoney(committed);
    setNetWorthLastUpdatedAtMs(Date.now());
    setNetWorthInputs((prev) => ({
      ...prev,
      liabilities: { ...prev.liabilities, [liabilityKey]: value },
    }));
  }, []);

  const handleResetNetWorth = useCallback(() => {
    setNetWorthImportError(null);
    setNetWorthRemoteFetchFailed(false);
    setNetWorthRemoteUpsertFailed(false);
    setNetWorthLastUpdatedAtMs(Date.now());
    setNetWorthInputs(getDefaultNetWorthInputs());
  }, []);

  const handleExportNetWorth = useCallback(() => {
    setNetWorthImportError(null);
    const json = JSON.stringify(netWorthInputs, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'net-worth.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [netWorthInputs]);

  const handleImportNetWorthFile = useCallback(async (file) => {
    setNetWorthImportError(null);
    try {
      const text = await file.text();
      const parsed = parseNetWorthImportJsonText(text);
      if (parsed === null) {
        setNetWorthImportError(getLabel('net_worth_import_error'));
        return;
      }
      setNetWorthLastUpdatedAtMs(Date.now());
      setNetWorthInputs(normalizeNetWorthInputs(parsed));
    } catch {
      setNetWorthImportError(getLabel('net_worth_import_error'));
    }
  }, []);

  // Latest signed-in user id — used to ignore stale Net Worth fetch results if the account changes.
  const userRef = useRef(user);
  userRef.current = user;

  // Track whether we have already loaded saved inputs for the current user
  // so we don't overwrite them when the debounce save fires after load.
  const loadedForUser = useRef(null);

  // ── Net worth: Supabase row when signed in; `localStorage` mirror on sign-out (same as pension tab pattern)
  useEffect(() => {
    if (!user) {
      setNetWorthLoadedForUserId(null);
      setNetWorthRemoteFetchFailed(false);
      setNetWorthRemoteUpsertFailed(false);
      try {
        const local = netWorthLocalPersistenceAdapter.load();
        setNetWorthInputs(local.inputs);
        setNetWorthLastUpdatedAtMs(local.lastUpdatedAtMs);
      } catch {
        // ignore corrupt device data
      }
      return;
    }
    if (netWorthLoadedForUserId === user.id) return;

    const uid = user.id;
    fetchNetWorthBundleForUser(uid)
      .then((result) => {
        if (userRef.current?.id !== uid) return;
        if (!result.ok) {
          setNetWorthRemoteFetchFailed(true);
          setNetWorthLoadedForUserId(uid);
          return;
        }
        setNetWorthRemoteFetchFailed(false);
        if (result.bundle != null) {
          setNetWorthInputs(result.bundle.inputs);
          setNetWorthLastUpdatedAtMs(result.bundle.lastUpdatedAtMs);
        }
        setNetWorthLoadedForUserId(uid);
      })
      .catch(() => {
        if (userRef.current?.id !== uid) return;
        setNetWorthRemoteFetchFailed(true);
        setNetWorthLoadedForUserId(uid);
      });
  }, [user, netWorthLoadedForUserId]);

  // ── Projection inputs: Supabase row when signed in; `localStorage` mirror always (same as Net Worth)
  useEffect(() => {
    if (!user) {
      setProjectionLoadedForUserId(null);
      setProjectionRemoteFetchFailed(false);
      setProjectionRemoteUpsertFailed(false);
      try {
        setProjectionInputs(loadProjectionInputsFromStorage());
      } catch {
        // ignore corrupt device data
      }
      return;
    }
    if (projectionLoadedForUserId === user.id) return;

    const uid = user.id;
    fetchProjectionInputsForUser(uid)
      .then((result) => {
        if (userRef.current?.id !== uid) return;
        if (!result.ok) {
          setProjectionRemoteFetchFailed(true);
          setProjectionLoadedForUserId(uid);
          return;
        }
        setProjectionRemoteFetchFailed(false);
        if (result.bundle != null) {
          setProjectionInputs(result.bundle.inputs);
        }
        setProjectionLoadedForUserId(uid);
      })
      .catch(() => {
        if (userRef.current?.id !== uid) return;
        setProjectionRemoteFetchFailed(true);
        setProjectionLoadedForUserId(uid);
      });
  }, [user, projectionLoadedForUserId]);

  // ── Load pension inputs from Supabase when the user signs in ─────────────
  useEffect(() => {
    if (!user) {
      loadedForUser.current = null;
      try {
        const saved = localStorage.getItem(STORAGE_KEY_PENSION);
        if (saved) {
          const p = JSON.parse(saved);
          if (p.inputs) {
            setInputs({
              ...DEFAULT_INPUTS,
              ...p.inputs,
              studentLoanPlan: p.inputs.studentLoanPlan === STUDENT_LOAN_PLAN_4 ? STUDENT_LOAN_PLAN_4 : (p.inputs.studentLoanPlan ?? ''),
            });
          }
          if (p.contributionMode) setContributionMode(p.contributionMode);
          if (p.displayPeriod)    setDisplayPeriod(p.displayPeriod);
          if (p.taxRegion)        setTaxRegion(normalizeTaxRegion(p.taxRegion));
        }
      } catch {
        // ignore corrupt data
      }
      return;
    }
    if (loadedForUser.current === user.id) return;

    supabase
      .from('pension_inputs')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setInputs({
            ...DEFAULT_INPUTS,
            grossSalary:        String(data.gross_salary        ?? ''),
            bonusIncome:
              data.bonus_income != null && data.bonus_income !== ''
                ? String(data.bonus_income)
                : '',
            benefitInKindTaxable:
              data.benefit_in_kind_taxable != null && data.benefit_in_kind_taxable !== ''
                ? String(data.benefit_in_kind_taxable)
                : '',
            employeeValue:      String(data.employee_value      ?? ''),
            employerValue:      String(data.employer_value      ?? ''),
            personalPensionNet: String(data.personal_pension_net ?? ''),
            studentLoanPlan:
              data.student_loan_plan === STUDENT_LOAN_PLAN_4 ? STUDENT_LOAN_PLAN_4 : '',
            sharePlanContribution:
              data.share_plan_contribution != null ? String(data.share_plan_contribution) : '',
            sharePlanType: data.share_plan_type === 'pre_tax' ? 'pre_tax' : 'post_tax',
          });
          if (data.contribution_mode) setContributionMode(data.contribution_mode);
          if (data.display_period)    setDisplayPeriod(data.display_period);
          if (data.tax_region != null) setTaxRegion(normalizeTaxRegion(data.tax_region));
        }
        loadedForUser.current = user.id;
      });
  }, [user]);

  // ── Debounce-save pension inputs to Supabase when logged in ──────────────
  const debounceTimer = useRef(null);
  const netWorthDebounceTimer = useRef(null);
  const projectionDebounceTimer = useRef(null);
  useEffect(() => {
    // Don't save until we've loaded the existing data (avoids overwriting with blanks)
    if (!user || loadedForUser.current !== user.id) return;

    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      await supabase.from('pension_inputs').upsert({
        user_id:             user.id,
        gross_salary:        inputs.grossSalary        !== '' ? Number(inputs.grossSalary)        : null,
        bonus_income:
          inputs.bonusIncome !== '' && inputs.bonusIncome !== undefined
            ? Number(inputs.bonusIncome)
            : null,
        benefit_in_kind_taxable:
          inputs.benefitInKindTaxable !== '' && inputs.benefitInKindTaxable !== undefined
            ? Number(inputs.benefitInKindTaxable)
            : null,
        employee_value:      inputs.employeeValue      !== '' ? Number(inputs.employeeValue)      : null,
        employer_value:      inputs.employerValue      !== '' ? Number(inputs.employerValue)      : null,
        personal_pension_net: inputs.personalPensionNet !== '' ? Number(inputs.personalPensionNet) : null,
        student_loan_plan:   inputs.studentLoanPlan === STUDENT_LOAN_PLAN_4 ? STUDENT_LOAN_PLAN_4 : null,
        share_plan_contribution:
          inputs.sharePlanContribution !== '' && inputs.sharePlanContribution !== undefined
            ? Number(inputs.sharePlanContribution)
            : null,
        share_plan_type: inputs.sharePlanType === 'pre_tax' ? 'pre_tax' : 'post_tax',
        contribution_mode:   contributionMode,
        display_period:      displayPeriod,
        tax_region:          taxRegion,
        updated_at:          new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }, 1000);

    return () => clearTimeout(debounceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs, contributionMode, displayPeriod, taxRegion, user]);

  // ── Mirror inputs to localStorage on every change (offline fallback) ──────
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PENSION, JSON.stringify({
      inputs,
      contributionMode,
      displayPeriod,
      taxRegion,
    }));
  }, [inputs, contributionMode, displayPeriod, taxRegion]);

  // ── Mirror net worth bundle to localStorage (always; offline / Supabase failure fallback) ─
  useEffect(() => {
    netWorthLocalPersistenceAdapter.save({
      inputs: netWorthInputs,
      lastUpdatedAtMs: netWorthLastUpdatedAtMs,
    });
  }, [netWorthInputs, netWorthLastUpdatedAtMs]);

  // ── Mirror projection inputs to localStorage (always; offline fallback; cloud when signed in via debounced upsert)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTION, JSON.stringify(projectionInputs));
    } catch {
      // ignore quota / private mode
    }
  }, [projectionInputs]);

  // ── Debounced Net Worth upsert to Supabase (only after remote load attempt finished for this user)
  useEffect(() => {
    if (!user || netWorthLoadedForUserId !== user.id) return;

    clearTimeout(netWorthDebounceTimer.current);
    netWorthDebounceTimer.current = setTimeout(() => {
      const uid = user.id;
      void upsertNetWorthBundleForUser(uid, {
        inputs: netWorthInputs,
        lastUpdatedAtMs: netWorthLastUpdatedAtMs,
      }).then((result) => {
        if (userRef.current?.id !== uid) return;
        setNetWorthRemoteUpsertFailed(!result.ok);
      });
    }, 1000);

    return () => clearTimeout(netWorthDebounceTimer.current);
  }, [netWorthInputs, netWorthLastUpdatedAtMs, user, netWorthLoadedForUserId]);

  // ── Debounced Projection inputs upsert to Supabase (only after remote load attempt finished for this user)
  useEffect(() => {
    if (!user || projectionLoadedForUserId !== user.id) return;

    clearTimeout(projectionDebounceTimer.current);
    projectionDebounceTimer.current = setTimeout(() => {
      const uid = user.id;
      void upsertProjectionInputsForUser(uid, projectionInputs).then((result) => {
        if (userRef.current?.id !== uid) return;
        setProjectionRemoteUpsertFailed(!result.ok);
      });
    }, 1000);

    return () => clearTimeout(projectionDebounceTimer.current);
  }, [projectionInputs, user, projectionLoadedForUserId]);

  // ── Input handlers ────────────────────────────────────────────────────────
  const handleChange = (field, value) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleModeToggle = (newMode) => {
    if (newMode === contributionMode) return;
    const salary = inputs.grossSalary;
    setInputs((prev) => {
      if (newMode === 'nominal') {
        return {
          ...prev,
          employeeValue: prev.employeeValue !== '' ? String(percentToNominal(prev.employeeValue, salary)) : '',
          employerValue: prev.employerValue !== '' ? String(percentToNominal(prev.employerValue, salary)) : '',
        };
      } else {
        return {
          ...prev,
          employeeValue: prev.employeeValue !== '' ? String(nominalToPercent(prev.employeeValue, salary)) : '',
          employerValue: prev.employerValue !== '' ? String(nominalToPercent(prev.employerValue, salary)) : '',
        };
      }
    });
    setContributionMode(newMode);
  };

  // ── Derived position ──────────────────────────────────────────────────────
  const empPct = contributionMode === 'percent'
    ? inputs.employeeValue
    : nominalToPercent(inputs.employeeValue, inputs.grossSalary);

  const erPct = contributionMode === 'percent'
    ? inputs.employerValue
    : nominalToPercent(inputs.employerValue, inputs.grossSalary);

  const sharePlanAnnual =
    inputs.sharePlanContribution !== '' && inputs.sharePlanContribution !== undefined
      ? Number(inputs.sharePlanContribution)
      : 0;

  const bonusAnnual =
    inputs.bonusIncome !== '' && inputs.bonusIncome !== undefined
      ? Number(inputs.bonusIncome)
      : 0;

  const benefitInKindAnnual =
    inputs.benefitInKindTaxable !== '' && inputs.benefitInKindTaxable !== undefined
      ? Number(inputs.benefitInKindTaxable)
      : 0;

  const position = calculateFullPosition(
    inputs.grossSalary,
    empPct,
    erPct,
    inputs.personalPensionNet,
    taxRegion,
    sharePlanAnnual,
    inputs.sharePlanType || 'post_tax',
    inputs.studentLoanPlan === STUDENT_LOAN_PLAN_4 ? STUDENT_LOAN_PLAN_4 : null,
    bonusAnnual,
    benefitInKindAnnual,
  );

  const pensionBenefit = getPensionBenefitBreakdown(position);
  const pensionBenefitChartData = buildPensionBenefitChartData(pensionBenefit.breakdown, {
    displayPeriod,
  });
  const pensionValueStacked = buildPensionValueStackedChartData(
    position,
    pensionBenefit.breakdown,
    displayPeriod,
  );

  const netMonthlyIncome = position.takeHome?.netTakeHomeMonthly ?? 0;

  const projectionSnapshot = useMemo(
    () => ({
      pensionHoldings: safeMoney(netWorthInputs.assets?.pensionHoldings),
      stocksAndShares: safeMoney(netWorthInputs.assets?.stocksAndShares),
      cash: safeMoney(netWorthInputs.assets?.cash),
      propertyValue: safeMoney(netWorthInputs.assets?.propertyValue),
      totalLiabilities: netWorthSummary.totalLiabilities,
      liabilityBreakdown: {
        mortgageBalance: derivedMortgageBalance,
        loans: safeMoney(netWorthInputs.liabilities?.loans),
        creditCards: safeMoney(netWorthInputs.liabilities?.creditCards),
      },
      mortgageFromBudget: readMortgageSummaryFromBudgetMirror(),
      annualPensionContribution: Number(position.totalGrossAnnual) || 0,
      monthlyBudgetSavings,
      monthlyCashSavings: monthlyCashBudgetSavings,
      monthlyStockSavings: monthlyStockBudgetSavings,
    }),
    [
      netWorthInputs,
      netWorthSummary.totalLiabilities,
      derivedMortgageBalance,
      position.totalGrossAnnual,
      monthlyBudgetSavings,
      monthlyCashBudgetSavings,
      monthlyStockBudgetSavings,
      activeTab,
    ],
  );

  const projectionResult = useMemo(
    () => computeProjectionSeries(projectionInputs, projectionSnapshot),
    [projectionInputs, projectionSnapshot],
  );

  const handleProjectionChange = useCallback((field, value) => {
    setProjectionInputs((prev) => normalizeProjectionInputs({ ...prev, [field]: value }));
  }, []);

  // ── Sign out ──────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(STORAGE_KEY_PENSION);
    localStorage.removeItem(STORAGE_KEY_PROJECTION);
    clearBudgetLocalStorageForSignOut();
    setInputs(DEFAULT_INPUTS);
    setTaxRegion('england');
    loadedForUser.current = null;
    setProjectionLoadedForUserId(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100">

      {/* Auth modal */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* Top row: logo + title + period toggle + auth controls */}
          <div className="flex items-center gap-3 py-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">UK Pension Planner</h1>
              <p className="text-sm text-slate-600 mt-0.5 max-w-md">
                See how pension savings affect your pay — in plain language. {position.currentYear} tax year.
              </p>
            </div>

            {/* Right-side controls */}
            <div className="ml-auto flex items-center gap-3">
              {activeTab === 'pension' && (
                <>
                  <TaxRegionToggle taxRegion={taxRegion} onToggle={setTaxRegion} />
                  <span className="text-xs text-slate-600 hidden sm:inline">{getLabel('display_period')}</span>
                  <PeriodToggle displayPeriod={displayPeriod} onToggle={setDisplayPeriod} />
                </>
              )}

              {/* Auth */}
              {!authLoading && (
                user ? (
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:block text-xs text-slate-500 max-w-[160px] truncate" title={user.email}>
                      {user.email}
                    </span>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600
                                 border border-slate-200 hover:border-red-300 rounded-lg transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(true)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600
                               hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Sign in
                  </button>
                )
              )}
            </div>
          </div>

          {/* Tab bar */}
          <nav className="flex gap-1 -mb-px">
            {[
              { id: 'pension',   labelKey: 'pension_tab' },
              { id: 'budget',    labelKey: 'budget_tab' },
              { id: 'networth',  labelKey: 'net_worth_tab' },
              { id: 'projection', labelKey: 'projection_tab' },
            ].map(({ id, labelKey }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {getLabel(labelKey)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 md:py-5 space-y-3 md:space-y-4">

        {/* Pension tab — always mounted */}
        <div className={activeTab === 'pension' ? 'space-y-3 md:space-y-4' : 'hidden'}>
          <div className="lg:grid lg:grid-cols-12 lg:gap-4 lg:items-start">
            <div className="lg:col-span-7 min-w-0">
              <InputForm
                values={inputs}
                onChange={handleChange}
                contributionMode={contributionMode}
                onModeToggle={handleModeToggle}
                displayPeriod={displayPeriod}
                taxRegion={taxRegion}
                grossSalary={position.grossSalary}
                remainingPensionNeeded={position.pensionBandImpact?.remainingNeeded ?? 0}
              />
            </div>
            <div className="mt-3 space-y-3 lg:mt-0 lg:col-span-5 lg:sticky lg:top-4 lg:self-start">
              <PensionTaxPanel
                taxBand={position.taxBand}
                updatedAdjustedIncome={position.updatedAdjustedIncome}
                takeHome={position.takeHome}
                displayPeriod={displayPeriod}
                grossSalary={position.grossSalary}
                employmentGrossIncome={position.employmentGrossIncome}
                bonusIncome={position.bonusIncome}
                benefitInKindAnnual={position.benefitInKindAnnual}
                benefitInKindIncomeTaxImpact={position.benefitInKindIncomeTaxImpact}
                taxRegion={taxRegion}
                reliefAtSourceExtraSaRelief={position.personalPension.saRelief}
                taxBandBeforePersonalPension={position.pensionBandImpact?.taxBandBeforePersonalPension}
                hasDroppedTaxBand={position.pensionBandImpact?.hasDroppedTaxBand}
                personalPensionNet={position.personalPensionNet}
                allowance={position.allowance}
              />
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <PensionValueStackedBarChart
                  summary={pensionValueStacked.summary}
                  detailed={pensionValueStacked.detailed}
                  displayPeriod={displayPeriod}
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <PensionBenefitBarChart
                  data={pensionBenefitChartData}
                  displayPeriod={displayPeriod}
                />
              </div>
              <details>
                <summary>Pension benefit breakdown (audit)</summary>
                <pre>
                  {JSON.stringify(
                    { breakdown: pensionBenefit.breakdown, trace: pensionBenefit.trace },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </div>
          </div>
        </div>

        {/* Budget tab — always mounted */}
        <div className={activeTab === 'budget' ? '' : 'hidden'}>
          <BudgetFeature netMonthlyIncome={netMonthlyIncome} user={user} />
        </div>

        {/* Net Worth tab — always mounted */}
        <div className={activeTab === 'networth' ? '' : 'hidden'}>
          <NetWorthTab
            netWorthInputs={netWorthInputs}
            derivedMortgageBalance={derivedMortgageBalance}
            onNetWorthAssetChange={handleNetWorthAssetChange}
            onNetWorthLiabilityChange={handleNetWorthLiabilityChange}
            onResetNetWorth={handleResetNetWorth}
            onExportNetWorth={handleExportNetWorth}
            onImportNetWorthFile={handleImportNetWorthFile}
            importError={netWorthImportError}
            lastUpdatedAtMs={netWorthLastUpdatedAtMs}
            persistenceStatusLabel={netWorthPersistenceStatusLabel}
            summary={netWorthSummary}
            insights={netWorthInsights}
          />
        </div>

        <div className={activeTab === 'projection' ? '' : 'hidden'}>
          <ProjectionTab
            projectionInputs={projectionInputs}
            onProjectionChange={handleProjectionChange}
            persistenceStatusLabel={projectionPersistenceStatusLabel}
            baseline={{
              annualPensionContribution: projectionSnapshot.annualPensionContribution,
              monthlyBudgetSavings: projectionSnapshot.monthlyBudgetSavings,
              monthlyCashSavings: projectionSnapshot.monthlyCashSavings,
              monthlyStockSavings: projectionSnapshot.monthlyStockSavings,
            }}
            projectionResult={projectionResult}
          />
        </div>

      </main>
    </div>
  );
}
