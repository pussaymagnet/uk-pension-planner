import { useState, useEffect, useRef } from 'react';
import { calculateFullPosition, nominalToPercent, percentToNominal } from './utils/calculations';
import InputForm from './components/InputForm';
import TaxBandIndicator from './components/TaxBandIndicator';
import ContributionsCard from './components/ContributionsCard';
import AllowanceCard from './components/AllowanceCard';
import TargetCard from './components/TargetCard';
import InfoFooter from './components/InfoFooter';
import TakeHomeCard from './components/TakeHomeCard';
import PensionValueCard from './components/PensionValueCard';
import BudgetTab from './components/BudgetTab';
import AuthModal from './components/AuthModal';
import { useUser } from './hooks/useUser';
import { supabase } from './lib/supabase';

// ─── constants ────────────────────────────────────────────────────────────────

const DEFAULT_INPUTS = {
  grossSalary:        '',
  employeeValue:      '',
  employerValue:      '',
  personalPensionNet: '',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

const PeriodToggle = ({ displayPeriod, onToggle }) => (
  <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 gap-0.5">
    {[
      { id: 'annual',  label: 'Annual'  },
      { id: 'monthly', label: 'Monthly' },
    ].map(({ id, label }) => (
      <button
        key={id}
        type="button"
        onClick={() => onToggle(id)}
        className={`px-3 py-1 rounded-md text-xs font-medium transition-all
          ${displayPeriod === id
            ? 'bg-white shadow-sm text-slate-900'
            : 'text-slate-500 hover:text-slate-700'}`}
      >
        {label}
      </button>
    ))}
  </div>
);

// ─── main component ───────────────────────────────────────────────────────────

export default function App() {
  const { user, loading: authLoading } = useUser();

  const [inputs, setInputs]                 = useState(DEFAULT_INPUTS);
  const [contributionMode, setContributionMode] = useState('percent');
  const [displayPeriod, setDisplayPeriod]   = useState('annual');
  const [activeTab, setActiveTab]           = useState('pension');
  const [showAuthModal, setShowAuthModal]   = useState(false);

  // Track whether we have already loaded saved inputs for the current user
  // so we don't overwrite them when the debounce save fires after load.
  const loadedForUser = useRef(null);

  // ── Load pension inputs from Supabase when the user signs in ─────────────
  useEffect(() => {
    if (!user) { loadedForUser.current = null; return; }
    if (loadedForUser.current === user.id) return;

    supabase
      .from('pension_inputs')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setInputs({
            grossSalary:        String(data.gross_salary        ?? ''),
            employeeValue:      String(data.employee_value      ?? ''),
            employerValue:      String(data.employer_value      ?? ''),
            personalPensionNet: String(data.personal_pension_net ?? ''),
          });
          if (data.contribution_mode) setContributionMode(data.contribution_mode);
          if (data.display_period)    setDisplayPeriod(data.display_period);
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
        contribution_mode:   contributionMode,
        display_period:      displayPeriod,
        updated_at:          new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }, 1000);

    return () => clearTimeout(debounceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs, contributionMode, displayPeriod, user]);

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

  const position = calculateFullPosition(
    inputs.grossSalary,
    empPct,
    erPct,
    inputs.personalPensionNet,
  );

  const netMonthlyIncome = position.takeHome?.netTakeHomeMonthly ?? 0;

  // ── Sign out ──────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setInputs(DEFAULT_INPUTS);
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
          <div className="flex items-center gap-3 py-4">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">UK Pension Planner</h1>
              <p className="text-xs text-slate-500">{position.currentYear} tax year</p>
            </div>

            {/* Right-side controls */}
            <div className="ml-auto flex items-center gap-3">
              {activeTab === 'pension' && (
                <>
                  <span className="text-xs text-slate-500 hidden sm:inline">Show figures</span>
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
              { id: 'pension', label: 'Pension Planner' },
              { id: 'budget',  label: 'Budget' },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Pension tab — always mounted */}
        <div className={activeTab === 'pension' ? 'space-y-6' : 'hidden'}>
          <InputForm
            values={inputs}
            onChange={handleChange}
            contributionMode={contributionMode}
            onModeToggle={handleModeToggle}
          />
          <TaxBandIndicator
            taxBand={position.taxBand}
            grossSalary={position.grossSalary}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ContributionsCard
              sacrifice={position.sacrifice}
              personalPension={position.personalPension}
              employerGrossAnnual={position.employerGrossAnnual}
              employerGrossMonthly={position.employerGrossMonthly}
              totalGrossAnnual={position.totalGrossAnnual}
              totalGrossMonthly={position.totalGrossMonthly}
              totalCombinedPct={position.totalCombinedPct}
              employeeSacrificePct={position.employeeSacrificePct}
              employerPercent={position.employerPercent}
              displayPeriod={displayPeriod}
            />
            <AllowanceCard allowance={position.allowance} />
            <TargetCard
              recommendation={position.recommendation}
              grossSalary={position.grossSalary}
            />
            <TakeHomeCard takeHome={position.takeHome} displayPeriod={displayPeriod} />
            <PensionValueCard pensionValue={position.pensionValue} displayPeriod={displayPeriod} />
          </div>
          <InfoFooter />
        </div>

        {/* Budget tab — always mounted */}
        <div className={activeTab === 'budget' ? '' : 'hidden'}>
          <BudgetTab netMonthlyIncome={netMonthlyIncome} user={user} />
        </div>

      </main>
    </div>
  );
}
