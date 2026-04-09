import { useState, useEffect, useRef } from 'react';
import { calculateFullPosition, nominalToPercent, percentToNominal, STUDENT_LOAN_PLAN_4 } from './utils/calculations';
import { normalizeTaxRegion } from './data/taxRules';
import InputForm from './components/InputForm';
import PensionTaxPanel from './components/PensionTaxPanel';
import BudgetTab from './components/BudgetTab';
import AuthModal from './components/AuthModal';
import { useUser } from './hooks/useUser';
import { supabase } from './lib/supabase';
import { getLabel } from './utils/fieldLabels';

// ─── constants ────────────────────────────────────────────────────────────────

const DEFAULT_INPUTS = {
  grossSalary:            '',
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

  // Track whether we have already loaded saved inputs for the current user
  // so we don't overwrite them when the debounce save fires after load.
  const loadedForUser = useRef(null);

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
  useEffect(() => {
    // Don't save until we've loaded the existing data (avoids overwriting with blanks)
    if (!user || loadedForUser.current !== user.id) return;

    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      await supabase.from('pension_inputs').upsert({
        user_id:             user.id,
        gross_salary:        inputs.grossSalary        !== '' ? Number(inputs.grossSalary)        : null,
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

  const position = calculateFullPosition(
    inputs.grossSalary,
    empPct,
    erPct,
    inputs.personalPensionNet,
    taxRegion,
    sharePlanAnnual,
    inputs.sharePlanType || 'post_tax',
    inputs.studentLoanPlan === STUDENT_LOAN_PLAN_4 ? STUDENT_LOAN_PLAN_4 : null,
  );

  const netMonthlyIncome = position.takeHome?.netTakeHomeMonthly ?? 0;

  // ── Sign out ──────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(STORAGE_KEY_PENSION);
    localStorage.removeItem('pension-planner-budget');
    localStorage.removeItem('pension-planner-budget-debts');
    localStorage.removeItem('pension-planner-budget-savings');
    setInputs(DEFAULT_INPUTS);
    setTaxRegion('england');
    loadedForUser.current = null;
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
              { id: 'pension', labelKey: 'pension_tab' },
              { id: 'budget',  labelKey: 'budget_tab' },
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
                taxRegion={taxRegion}
                reliefAtSourceExtraSaRelief={position.personalPension.saRelief}
                taxBandBeforePersonalPension={position.pensionBandImpact?.taxBandBeforePersonalPension}
                hasDroppedTaxBand={position.pensionBandImpact?.hasDroppedTaxBand}
                personalPensionNet={position.personalPensionNet}
              />
            </div>
          </div>
        </div>

        {/* Budget tab — always mounted */}
        <div className={activeTab === 'budget' ? '' : 'hidden'}>
          <BudgetTab netMonthlyIncome={netMonthlyIncome} user={user} />
        </div>

      </main>
    </div>
  );
}
