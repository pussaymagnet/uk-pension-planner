/**
 * BudgetTab
 *
 * Household budget tracker — Partner 1 view only.
 * - When `user` prop is present, data is loaded from / saved to Supabase.
 * - When no `user`, data is stored in localStorage only (same behaviour as before).
 * - localStorage always mirrors the current list as an offline safety net.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  calculateAmortizingMonthlyPayment,
  calculateTotalInterest,
} from '../utils/debt';
import {
  SECTION_FIXED,
  SECTION_NICE,
  createDefaultExpenditures,
  normalizeExpenditureRow,
} from './budgetConstants';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = (value) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);

const r2 = (n) => Math.round((n ?? 0) * 100) / 100;

const STORAGE_KEY = 'pension-planner-budget';
const STORAGE_KEY_DEBTS = 'pension-planner-budget-debts';
const STORAGE_KEY_SAVINGS = 'pension-planner-budget-savings';

const BLANK_FORM = { name: '', amount: '0', partner1Pct: '100', section: SECTION_FIXED };
const BLANK_DEBT_FORM = { name: '', principal: '', annualRate: '', termYears: '' };
const BLANK_SAVINGS_FORM = { name: '', amount: '' };

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── sub-components ───────────────────────────────────────────────────────────

const SectionCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-6 ${className}`}>
    {children}
  </div>
);

const Label = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-600 mb-1">
    {children}
  </label>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16" />
  </svg>
);

// ─── main component ───────────────────────────────────────────────────────────

export default function BudgetTab({ netMonthlyIncome = 0, user = null }) {
  const [expenditures, setExpenditures] = useState([]);
  const [debts, setDebts]               = useState([]);
  const [showForm, setShowForm]         = useState(false);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [editingDebtId, setEditingDebtId] = useState(null);
  const [formValues, setFormValues]     = useState(BLANK_FORM);
  const [debtFormValues, setDebtFormValues] = useState(BLANK_DEBT_FORM);
  const [errors, setErrors]             = useState({});
  const [debtErrors, setDebtErrors]     = useState({});
  const [flashId, setFlashId]           = useState(null);
  const [flashDebtId, setFlashDebtId]   = useState(null);
  const [syncing, setSyncing]           = useState(false);
  const [syncError, setSyncError]       = useState(null);

  const [savings, setSavings]                     = useState([]);
  const [showSavingsForm, setShowSavingsForm]     = useState(false);
  const [editingSavingId, setEditingSavingId]     = useState(null);
  const [savingsFormValues, setSavingsFormValues] = useState(BLANK_SAVINGS_FORM);
  const [savingsErrors, setSavingsErrors]         = useState({});
  const [flashSavingId, setFlashSavingId]         = useState(null);

  // Prevent the Supabase loader running twice for the same user
  const loadedForUser = useRef(null);

  const dbUpsert = useCallback(async (entry, sortOrder) => {
    if (!user) return;
    await supabase.from('budget_expenditures').upsert({
      id:            entry.id,
      user_id:       user.id,
      name:          entry.name,
      amount:        entry.amount,
      partner1_pct:  entry.partner1Pct,
      section:       entry.section === SECTION_NICE ? SECTION_NICE : SECTION_FIXED,
      sort_order:    sortOrder,
    }, { onConflict: 'id' });
  }, [user]);

  const dbDelete = useCallback(async (id) => {
    if (!user) return;
    await supabase.from('budget_expenditures').delete().eq('id', id);
  }, [user]);

  const dbUpsertDebt = useCallback(async (entry, sortOrder) => {
    if (!user) return;
    await supabase.from('budget_debts').upsert({
      id:               entry.id,
      user_id:          user.id,
      name:             entry.name,
      principal:        entry.principal,
      annual_rate_pct:  entry.annualRatePct,
      term_months:      entry.termMonths,
      sort_order:       sortOrder,
    }, { onConflict: 'id' });
  }, [user]);

  const dbDeleteDebt = useCallback(async (id) => {
    if (!user) return;
    await supabase.from('budget_debts').delete().eq('id', id);
  }, [user]);

  const dbUpsertSaving = useCallback(async (entry, sortOrder) => {
    if (!user) return;
    await supabase.from('budget_savings').upsert({
      id:         entry.id,
      user_id:    user.id,
      name:       entry.name,
      amount:     entry.amount,
      sort_order: sortOrder,
    }, { onConflict: 'id' });
  }, [user]);

  const dbDeleteSaving = useCallback(async (id) => {
    if (!user) return;
    await supabase.from('budget_savings').delete().eq('id', id);
  }, [user]);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      if (loadedForUser.current === user.id) return;
      setSyncing(true);
      Promise.all([
        supabase
          .from('budget_expenditures')
          .select('*')
          .eq('user_id', user.id)
          .order('sort_order', { ascending: true }),
        supabase
          .from('budget_debts')
          .select('*')
          .eq('user_id', user.id)
          .order('sort_order', { ascending: true }),
        supabase
          .from('budget_savings')
          .select('*')
          .eq('user_id', user.id)
          .order('sort_order', { ascending: true }),
      ]).then(async ([expRes, debtRes, savRes]) => {
        let expRows = [];
        if (expRes.data != null && expRes.data.length > 0) {
          expRows = [...expRes.data]
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((r) => normalizeExpenditureRow(r));
          const fixed = expRows.filter((e) => e.section === SECTION_FIXED);
          const nice = expRows.filter((e) => e.section === SECTION_NICE);
          expRows = [...fixed, ...nice];
        } else if (expRes.data != null && expRes.data.length === 0) {
          expRows = createDefaultExpenditures();
          for (let i = 0; i < expRows.length; i++) {
            await dbUpsert(expRows[i], i);
          }
        }
        setExpenditures(expRows);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expRows));

        if (debtRes.data) {
          const drows = debtRes.data.map((r) => ({
            id:            r.id,
            name:          r.name ?? '',
            principal:     Number(r.principal),
            annualRatePct: Number(r.annual_rate_pct),
            termMonths:    Number(r.term_months),
          }));
          setDebts(drows);
          localStorage.setItem(STORAGE_KEY_DEBTS, JSON.stringify(drows));
        }

        if (savRes.data) {
          const srows = savRes.data.map((r) => ({
            id:     r.id,
            name:   r.name ?? '',
            amount: Number(r.amount),
          }));
          setSavings(srows);
          localStorage.setItem(STORAGE_KEY_SAVINGS, JSON.stringify(srows));
        }

        loadedForUser.current = user.id;
        setSyncing(false);
      });
    } else {
      loadedForUser.current = null;
      let expRows = [];
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            expRows = parsed.map((r) => normalizeExpenditureRow(r));
            const fixed = expRows.filter((e) => e.section === SECTION_FIXED);
            const nice = expRows.filter((e) => e.section === SECTION_NICE);
            expRows = [...fixed, ...nice];
          }
        }
      } catch {
        // ignore corrupt data
      }
      if (expRows.length === 0) {
        expRows = createDefaultExpenditures();
      }
      setExpenditures(expRows);

      try {
        const savedDebts = localStorage.getItem(STORAGE_KEY_DEBTS);
        if (savedDebts) setDebts(JSON.parse(savedDebts));
      } catch {
        // ignore corrupt data
      }

      try {
        const savedSavings = localStorage.getItem(STORAGE_KEY_SAVINGS);
        if (savedSavings) setSavings(JSON.parse(savedSavings));
      } catch {
        // ignore corrupt data
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Mirror to localStorage on every change ────────────────────────────────
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenditures));
  }, [expenditures]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DEBTS, JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SAVINGS, JSON.stringify(savings));
  }, [savings]);

  // ── Derived calculations ──────────────────────────────────────────────────
  const p1Amount = (exp) => r2((exp.partner1Pct / 100) * exp.amount);
  const p1Total  = r2(expenditures.reduce((s, e) => s + p1Amount(e), 0));
  const combined = r2(expenditures.reduce((s, e) => s + (e.amount ?? 0), 0));

  const debtMonthly = (d) =>
    calculateAmortizingMonthlyPayment(d.principal, d.annualRatePct, d.termMonths);
  const debtMonthlyTotal = r2(debts.reduce((s, d) => s + debtMonthly(d), 0));
  const savingsTotal     = r2(savings.reduce((s, v) => s + (v.amount ?? 0), 0));
  const p1CommittedTotal = r2(p1Total + debtMonthlyTotal + savingsTotal);

  const p1Remain = r2(netMonthlyIncome - p1Total - debtMonthlyTotal - savingsTotal);

  const fixedExpenditures = expenditures.filter((e) => e.section === SECTION_FIXED);
  const niceExpenditures = expenditures.filter((e) => e.section === SECTION_NICE);

  const fixedCombined = r2(fixedExpenditures.reduce((s, e) => s + (e.amount ?? 0), 0));
  const fixedP1Total = r2(fixedExpenditures.reduce((s, e) => s + p1Amount(e), 0));
  const niceCombined = r2(niceExpenditures.reduce((s, e) => s + (e.amount ?? 0), 0));
  const niceP1Total = r2(niceExpenditures.reduce((s, e) => s + p1Amount(e), 0));

  // ── Form helpers ──────────────────────────────────────────────────────────
  const openAddExpenditure = (section) => {
    setShowDebtForm(false);
    setEditingDebtId(null);
    setEditingId(null);
    setFormValues({ ...BLANK_FORM, section });
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (exp) => {
    setShowDebtForm(false);
    setEditingDebtId(null);
    setEditingId(exp.id);
    setFormValues({
      name:        exp.name,
      amount:      String(exp.amount ?? 0),
      partner1Pct: String(exp.partner1Pct),
      section:     exp.section === SECTION_NICE ? SECTION_NICE : SECTION_FIXED,
    });
    setErrors({});
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setErrors({});
  };

  const openAddDebt = () => {
    setShowForm(false);
    setEditingId(null);
    setEditingDebtId(null);
    setDebtFormValues(BLANK_DEBT_FORM);
    setDebtErrors({});
    setShowDebtForm(true);
  };

  const openEditDebt = (d) => {
    setShowForm(false);
    setEditingId(null);
    setEditingDebtId(d.id);
    const yrs = d.termMonths / 12;
    setDebtFormValues({
      name:        d.name || '',
      principal:   String(d.principal),
      annualRate:  String(d.annualRatePct),
      termYears:   String(Number.isInteger(yrs) ? yrs : r2(yrs)),
    });
    setDebtErrors({});
    setShowDebtForm(true);
  };

  const cancelDebtForm = () => {
    setShowDebtForm(false);
    setEditingDebtId(null);
    setDebtErrors({});
  };

  const openAddSaving = () => {
    setShowForm(false);
    setShowDebtForm(false);
    setEditingId(null);
    setEditingDebtId(null);
    setEditingSavingId(null);
    setSavingsFormValues(BLANK_SAVINGS_FORM);
    setSavingsErrors({});
    setShowSavingsForm(true);
  };

  const openEditSaving = (sv) => {
    setShowForm(false);
    setShowDebtForm(false);
    setEditingId(null);
    setEditingDebtId(null);
    setEditingSavingId(sv.id);
    setSavingsFormValues({ name: sv.name || '', amount: String(sv.amount) });
    setSavingsErrors({});
    setShowSavingsForm(true);
  };

  const cancelSavingsForm = () => {
    setShowSavingsForm(false);
    setEditingSavingId(null);
    setSavingsErrors({});
  };

  const handleFormChange = (field, value) => {
    setFormValues((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'partner1Pct') {
        const n = Number(value);
        if (!isNaN(n)) next.partner1Pct = String(Math.min(100, Math.max(0, n)));
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleDebtFormChange = (field, value) => {
    setDebtFormValues((prev) => ({ ...prev, [field]: value }));
    setDebtErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSavingsFormChange = (field, value) => {
    setSavingsFormValues((prev) => ({ ...prev, [field]: value }));
    setSavingsErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = useCallback(() => {
    const errs = {};
    if (!formValues.name.trim()) errs.name = 'Please enter an expenditure name.';
    const amt = parseFloat(formValues.amount);
    if (formValues.amount === '' || isNaN(amt) || amt < 0) {
      errs.amount = 'Please enter zero or a positive amount.';
    }
    const pct = parseFloat(formValues.partner1Pct);
    if (isNaN(pct) || pct < 0 || pct > 100) errs.partner1Pct = 'Percentage must be 0–100.';
    return errs;
  }, [formValues]);

  const validateDebt = useCallback(() => {
    const errs = {};
    const pr = parseFloat(debtFormValues.principal);
    if (!debtFormValues.principal || isNaN(pr) || pr <= 0) {
      errs.principal = 'Enter amount borrowed (greater than zero).';
    }
    const ar = parseFloat(debtFormValues.annualRate);
    if (debtFormValues.annualRate === '' || isNaN(ar) || ar < 0) {
      errs.annualRate = 'Enter annual interest rate (0 or more).';
    }
    const ty = parseFloat(debtFormValues.termYears);
    if (!debtFormValues.termYears || isNaN(ty) || ty <= 0) {
      errs.termYears = 'Enter term in years (greater than zero).';
    }
    return errs;
  }, [debtFormValues]);

  const validateSaving = useCallback(() => {
    const errs = {};
    const am = parseFloat(savingsFormValues.amount);
    if (!savingsFormValues.amount || isNaN(am) || am <= 0) {
      errs.amount = 'Enter a positive amount.';
    }
    return errs;
  }, [savingsFormValues]);

  const saveForm = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const section = formValues.section === SECTION_NICE ? SECTION_NICE : SECTION_FIXED;
    const entry = {
      id:          editingId ?? uid(),
      name:        formValues.name.trim(),
      amount:      r2(parseFloat(formValues.amount === '' ? '0' : formValues.amount)),
      partner1Pct: r2(parseFloat(formValues.partner1Pct)),
      section,
    };

    let nextList;
    setExpenditures((prev) => {
      let next;
      if (editingId) {
        next = prev.map((e) => (e.id === editingId ? entry : e));
      } else {
        next = [...prev, entry];
      }
      const fixed = next.filter((e) => e.section === SECTION_FIXED);
      const nice = next.filter((e) => e.section === SECTION_NICE);
      nextList = [...fixed, ...nice];
      return nextList;
    });

    const sortOrder = nextList ? nextList.findIndex((e) => e.id === entry.id) : 0;
    try {
      await dbUpsert(entry, sortOrder);
      setSyncError(null);
    } catch {
      setSyncError('Could not save to your account. Check your connection and try again.');
    }

    setFlashId(entry.id);
    setTimeout(() => setFlashId(null), 1200);
    cancelForm();
  };

  const deleteEntry = async (id) => {
    setExpenditures((prev) => prev.filter((e) => e.id !== id));
    try {
      await dbDelete(id);
      setSyncError(null);
    } catch {
      setSyncError('Could not delete from your account. Check your connection and try again.');
    }
  };

  const renderExpenditureRows = (rows) =>
    rows.map((exp) => (
      <div
        key={exp.id}
        className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-50 last:border-0
                    items-center transition-colors
                    ${flashId === exp.id ? 'bg-green-50' : 'hover:bg-slate-50'}`}
      >
        <span className="col-span-5 text-sm font-medium text-slate-800 truncate">{exp.name}</span>
        <span className="col-span-3 text-sm text-slate-600 text-right tabular-nums">{fmt(exp.amount)}</span>
        <span className="col-span-2 text-sm font-semibold text-slate-800 text-right tabular-nums">{fmt(p1Amount(exp))}</span>
        <div className="col-span-2 flex items-center justify-end gap-1">
          <span className="text-xs text-slate-400">{exp.partner1Pct}%</span>
          <button
            type="button"
            aria-label={`Edit ${exp.name}`}
            onClick={() => openEdit(exp)}
            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
          >
            <EditIcon />
          </button>
          <button
            type="button"
            aria-label={`Delete ${exp.name}`}
            onClick={() => deleteEntry(exp.id)}
            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
          >
            <DeleteIcon />
          </button>
        </div>
      </div>
    ));

  const saveDebtForm = async () => {
    const errs = validateDebt();
    if (Object.keys(errs).length) {
      setDebtErrors(errs);
      return;
    }

    const principal = r2(parseFloat(debtFormValues.principal));
    const annualRatePct = r2(parseFloat(debtFormValues.annualRate));
    const termMonths = Math.max(1, Math.round(parseFloat(debtFormValues.termYears) * 12));

    const entry = {
      id:          editingDebtId ?? uid(),
      name:        debtFormValues.name.trim(),
      principal,
      annualRatePct,
      termMonths,
    };

    let nextList;
    setDebts((prev) => {
      nextList = editingDebtId
        ? prev.map((d) => (d.id === editingDebtId ? entry : d))
        : [...prev, entry];
      return nextList;
    });

    const sortOrder = nextList ? nextList.findIndex((d) => d.id === entry.id) : 0;
    try {
      await dbUpsertDebt(entry, sortOrder);
      setSyncError(null);
    } catch {
      setSyncError('Could not save to your account. Check your connection and try again.');
    }

    setFlashDebtId(entry.id);
    setTimeout(() => setFlashDebtId(null), 1200);
    cancelDebtForm();
  };

  const deleteDebtEntry = async (id) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
    try {
      await dbDeleteDebt(id);
      setSyncError(null);
    } catch {
      setSyncError('Could not delete from your account. Check your connection and try again.');
    }
  };

  const saveSavingsForm = async () => {
    const errs = validateSaving();
    if (Object.keys(errs).length) {
      setSavingsErrors(errs);
      return;
    }

    const entry = {
      id:     editingSavingId ?? uid(),
      name:   savingsFormValues.name.trim(),
      amount: r2(parseFloat(savingsFormValues.amount)),
    };

    let nextList;
    setSavings((prev) => {
      nextList = editingSavingId
        ? prev.map((sv) => (sv.id === editingSavingId ? entry : sv))
        : [...prev, entry];
      return nextList;
    });

    const sortOrder = nextList ? nextList.findIndex((sv) => sv.id === entry.id) : 0;
    try {
      await dbUpsertSaving(entry, sortOrder);
      setSyncError(null);
    } catch {
      setSyncError('Could not save to your account. Check your connection and try again.');
    }

    setFlashSavingId(entry.id);
    setTimeout(() => setFlashSavingId(null), 1200);
    cancelSavingsForm();
  };

  const deleteSavingEntry = async (id) => {
    setSavings((prev) => prev.filter((sv) => sv.id !== id));
    try {
      await dbDeleteSaving(id);
      setSyncError(null);
    } catch {
      setSyncError('Could not delete from your account. Check your connection and try again.');
    }
  };

  const formatTermLabel = (termMonths) => {
    const m = Math.floor(Number(termMonths)) || 0;
    if (m <= 0) return '—';
    if (m % 12 === 0) {
      const y = m / 12;
      return `${y} yr${y !== 1 ? 's' : ''}`;
    }
    return `${m} mo`;
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Household budget</h2>
          <p className="text-sm text-slate-600 mt-0.5 leading-relaxed max-w-xl">
            List regular bills and borrowing so you can see what’s left after essentials. Works with the monthly
            pay figure from the Pension &amp; pay tab.
          </p>
        </div>
        {/* Sync indicator */}
        {syncing && (
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Loading…
          </span>
        )}
        {user && !syncing && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved to your account
          </span>
        )}
      </div>

      {syncError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-xs font-semibold text-red-700 mb-0.5">Cloud sync failed</p>
            <p className="text-xs text-red-600">{syncError}</p>
            <p className="text-xs text-red-500 mt-1">
              Your data is saved locally on this device. Sign out and back in after fixing the issue to restore sync.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSyncError(null)}
            className="text-red-400 hover:text-red-600 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* ══ LEFT — expenditure list (3/5) ══════════════════════════════════ */}
        <div className="lg:col-span-3 space-y-4">

          {/* Add debt (top) */}
          {!showForm && !showDebtForm && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openAddDebt}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800
                           text-white text-sm font-medium rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Debt
              </button>
            </div>
          )}

          {/* ── Add / Edit form ── */}
          {showForm && (
            <SectionCard>
              <h3 className="text-base font-semibold text-slate-900 mb-4">
                {editingId ? 'Edit expenditure' : 'New expenditure'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="sm:col-span-2">
                  <Label htmlFor="exp-name">Expenditure name</Label>
                  <input
                    id="exp-name"
                    type="text"
                    placeholder="e.g. Council Tax, Electricity, Mortgage"
                    value={formValues.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${errors.name ? 'border-red-400' : 'border-slate-300'}`}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="exp-section">Section</Label>
                  <select
                    id="exp-section"
                    value={formValues.section === SECTION_NICE ? SECTION_NICE : SECTION_FIXED}
                    onChange={(e) => handleFormChange('section', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value={SECTION_FIXED}>Fixed Costs</option>
                    <option value={SECTION_NICE}>Nice to Have</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <Label htmlFor="exp-amount">Amount (£ / month)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                    <input
                      id="exp-amount"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={formValues.amount}
                      onChange={(e) => handleFormChange('amount', e.target.value)}
                      className={`w-full pl-7 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                        ${errors.amount ? 'border-red-400' : 'border-slate-300'}`}
                    />
                  </div>
                  {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
                </div>

                {/* My share % */}
                <div>
                  <Label htmlFor="exp-p1pct">My Share %</Label>
                  <div className="relative">
                    <input
                      id="exp-p1pct"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={formValues.partner1Pct}
                      onChange={(e) => handleFormChange('partner1Pct', e.target.value)}
                      className={`w-full pr-8 pl-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                        ${errors.partner1Pct ? 'border-red-400' : 'border-slate-300'}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                  </div>
                  {errors.partner1Pct && <p className="text-xs text-red-500 mt-1">{errors.partner1Pct}</p>}
                </div>
              </div>

              {/* Form actions */}
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={saveForm}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </SectionCard>
          )}

          {/* ── Expenditures: Fixed Costs + Nice to Have ── */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-900">Expenditures</h3>

            {/* Fixed Costs */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h4 className="text-sm font-semibold text-slate-800">Fixed Costs</h4>
                {!showForm && !showDebtForm && (
                  <button
                    type="button"
                    onClick={() => openAddExpenditure(SECTION_FIXED)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Add fixed cost
                  </button>
                )}
              </div>
              {fixedExpenditures.length === 0 ? (
                <SectionCard>
                  <p className="text-sm text-slate-400 italic text-center py-4">
                    No fixed costs. Add one or they will appear here from defaults.
                  </p>
                </SectionCard>
              ) : (
                <SectionCard className="p-0 overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100
                                  text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <span className="col-span-5">Name</span>
                    <span className="col-span-3 text-right">Total</span>
                    <span className="col-span-2 text-right">My Share</span>
                    <span className="col-span-2 text-right">My %</span>
                  </div>
                  {renderExpenditureRows(fixedExpenditures)}
                  <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200">
                    <span className="col-span-5 text-sm font-semibold text-slate-700">Fixed subtotal</span>
                    <span className="col-span-3 text-sm font-bold text-slate-900 text-right tabular-nums">{fmt(fixedCombined)}</span>
                    <span className="col-span-2 text-sm font-bold text-blue-700 text-right tabular-nums">{fmt(fixedP1Total)}</span>
                    <span className="col-span-2" />
                  </div>
                </SectionCard>
              )}
            </div>

            {/* Nice to Have */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h4 className="text-sm font-semibold text-slate-800">Nice to Have</h4>
                {!showForm && !showDebtForm && (
                  <button
                    type="button"
                    onClick={() => openAddExpenditure(SECTION_NICE)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Add nice to have
                  </button>
                )}
              </div>
              {niceExpenditures.length === 0 ? (
                <SectionCard>
                  <p className="text-sm text-slate-400 italic text-center py-4">
                    No nice-to-have items yet.
                  </p>
                </SectionCard>
              ) : (
                <SectionCard className="p-0 overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100
                                  text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <span className="col-span-5">Name</span>
                    <span className="col-span-3 text-right">Total</span>
                    <span className="col-span-2 text-right">My Share</span>
                    <span className="col-span-2 text-right">My %</span>
                  </div>
                  {renderExpenditureRows(niceExpenditures)}
                  <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200">
                    <span className="col-span-5 text-sm font-semibold text-slate-700">Nice to have subtotal</span>
                    <span className="col-span-3 text-sm font-bold text-slate-900 text-right tabular-nums">{fmt(niceCombined)}</span>
                    <span className="col-span-2 text-sm font-bold text-blue-700 text-right tabular-nums">{fmt(niceP1Total)}</span>
                    <span className="col-span-2" />
                  </div>
                </SectionCard>
              )}
            </div>

            {/* Grand total */}
            {expenditures.length > 0 && (
              <SectionCard className="p-0 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <span className="col-span-5 text-sm font-semibold text-slate-800">All expenditures total</span>
                  <span className="col-span-3 text-sm font-bold text-slate-900 text-right tabular-nums">{fmt(combined)}</span>
                  <span className="col-span-2 text-sm font-bold text-blue-700 text-right tabular-nums">{fmt(p1Total)}</span>
                  <span className="col-span-2" />
                </div>
              </SectionCard>
            )}
          </div>

          {/* ── Debt form ── */}
          {showDebtForm && (
            <SectionCard>
              <h3 className="text-base font-semibold text-slate-900 mb-4">
                {editingDebtId ? 'Edit Debt' : 'New Debt'}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Repayment is calculated as a standard amortizing loan (APR compounded monthly). 
                Your monthly payment is deducted from money available after bills.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="debt-name">Label (optional)</Label>
                  <input
                    id="debt-name"
                    type="text"
                    placeholder="e.g. Car loan, Credit card"
                    value={debtFormValues.name}
                    onChange={(e) => handleDebtFormChange('name', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <Label htmlFor="debt-principal">Amount borrowed (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">£</span>
                    <input
                      id="debt-principal"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={debtFormValues.principal}
                      onChange={(e) => handleDebtFormChange('principal', e.target.value)}
                      className={`w-full pl-7 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                        ${debtErrors.principal ? 'border-red-400' : 'border-slate-300'}`}
                    />
                  </div>
                  {debtErrors.principal && (
                    <p className="text-xs text-red-500 mt-1">{debtErrors.principal}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="debt-rate">Interest rate (% per year)</Label>
                  <div className="relative">
                    <input
                      id="debt-rate"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={debtFormValues.annualRate}
                      onChange={(e) => handleDebtFormChange('annualRate', e.target.value)}
                      className={`w-full pr-8 pl-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                        ${debtErrors.annualRate ? 'border-red-400' : 'border-slate-300'}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                  </div>
                  {debtErrors.annualRate && (
                    <p className="text-xs text-red-500 mt-1">{debtErrors.annualRate}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="debt-term">Term (years)</Label>
                  <input
                    id="debt-term"
                    type="number"
                    min="0"
                    step="0.25"
                    placeholder="e.g. 5"
                    value={debtFormValues.termYears}
                    onChange={(e) => handleDebtFormChange('termYears', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${debtErrors.termYears ? 'border-red-400' : 'border-slate-300'}`}
                  />
                  {debtErrors.termYears && (
                    <p className="text-xs text-red-500 mt-1">{debtErrors.termYears}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={saveDebtForm}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelDebtForm}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </SectionCard>
          )}

          {/* ── Debts list ── */}
          <div className="pt-2">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Debts &amp; loans</h3>
            {debts.length === 0 ? (
              <SectionCard>
                <p className="text-sm text-slate-400 italic text-center py-4">
                  No debts added. Use &quot;Add Debt&quot; to include repayments in your available money.
                </p>
              </SectionCard>
            ) : (
              <SectionCard className="p-0 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100
                                text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span className="col-span-3">Label</span>
                  <span className="col-span-2 text-right">Borrowed</span>
                  <span className="col-span-2 text-right">APR</span>
                  <span className="col-span-2 text-right">Term</span>
                  <span className="col-span-2 text-right">/ month</span>
                  <span className="col-span-1" />
                </div>
                {debts.map((d) => {
                  const dm = debtMonthly(d);
                  const interestTotal = calculateTotalInterest(d.principal, dm, d.termMonths);
                  return (
                    <div
                      key={d.id}
                      className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-50 last:border-0
                                  items-center transition-colors
                                  ${flashDebtId === d.id ? 'bg-green-50' : 'hover:bg-slate-50'}`}
                    >
                      <span className="col-span-3 text-sm font-medium text-slate-800 truncate">
                        {d.name || 'Debt'}
                      </span>
                      <span className="col-span-2 text-sm text-slate-600 text-right tabular-nums">{fmt(d.principal)}</span>
                      <span className="col-span-2 text-sm text-slate-600 text-right tabular-nums">{r2(d.annualRatePct)}%</span>
                      <span className="col-span-2 text-sm text-slate-600 text-right">{formatTermLabel(d.termMonths)}</span>
                      <div className="col-span-2 text-right">
                        <span className="text-sm font-semibold text-slate-900 tabular-nums">{fmt(dm)}</span>
                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                          Interest over term: {fmt(interestTotal)}
                        </p>
                      </div>
                      <div className="col-span-1 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${d.name || 'debt'}`}
                          onClick={() => openEditDebt(d)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${d.name || 'debt'}`}
                          onClick={() => deleteDebtEntry(d.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200">
                  <span className="col-span-9 text-sm font-semibold text-slate-700">Total repayments / month</span>
                  <span className="col-span-3 text-sm font-bold text-slate-900 text-right tabular-nums">{fmt(debtMonthlyTotal)}</span>
                </div>
              </SectionCard>
            )}
          </div>

          {/* ── Savings list ── */}
          <div className="pt-2">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Monthly savings</h3>
            {savings.length === 0 ? (
              <SectionCard>
                <p className="text-sm text-slate-400 italic text-center py-4">
                  No savings added. Use &quot;Add Saving&quot; to track what you set aside each month.
                </p>
              </SectionCard>
            ) : (
              <SectionCard className="p-0 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100
                                text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span className="col-span-9">Label</span>
                  <span className="col-span-2 text-right">/ month</span>
                  <span className="col-span-1" />
                </div>
                {savings.map((sv) => (
                  <div
                    key={sv.id}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-50 last:border-0
                                items-center transition-colors
                                ${flashSavingId === sv.id ? 'bg-green-50' : 'hover:bg-slate-50'}`}
                  >
                    <span className="col-span-9 text-sm font-medium text-slate-800 truncate">
                      {sv.name || 'Saving'}
                    </span>
                    <span className="col-span-2 text-sm font-semibold text-slate-900 text-right tabular-nums">
                      {fmt(sv.amount)}
                    </span>
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${sv.name || 'saving'}`}
                        onClick={() => openEditSaving(sv)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${sv.name || 'saving'}`}
                        onClick={() => deleteSavingEntry(sv.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200">
                  <span className="col-span-10 text-sm font-semibold text-slate-700">Total savings / month</span>
                  <span className="col-span-2 text-sm font-bold text-slate-900 text-right tabular-nums">{fmt(savingsTotal)}</span>
                </div>
              </SectionCard>
            )}

            {/* Add Saving button */}
            {!showSavingsForm && (
              <button
                type="button"
                onClick={openAddSaving}
                className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-600
                           hover:text-emerald-700 transition-colors"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full
                                 bg-emerald-100 text-emerald-600 text-lg leading-none">+</span>
                Add Saving
              </button>
            )}

            {/* ── Savings form ── */}
            {showSavingsForm && (
              <SectionCard className="mt-3 bg-emerald-50 border-emerald-100">
                <p className="text-sm font-semibold text-slate-800 mb-3">
                  {editingSavingId ? 'Edit saving' : 'Add saving'}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="e.g. Emergency fund"
                      value={savingsFormValues.name}
                      onChange={(e) => handleSavingsFormChange('name', e.target.value)}
                    />
                    {savingsErrors.name && (
                      <p className="text-xs text-red-500 mt-1">{savingsErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Monthly amount (£)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="0"
                      value={savingsFormValues.amount}
                      onChange={(e) => handleSavingsFormChange('amount', e.target.value)}
                    />
                    {savingsErrors.amount && (
                      <p className="text-xs text-red-500 mt-1">{savingsErrors.amount}</p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={saveSavingsForm}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm
                                 font-semibold py-2 rounded-xl transition-colors"
                    >
                      {editingSavingId ? 'Update' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelSavingsForm}
                      className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700
                                 text-sm font-medium py-2 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </SectionCard>
            )}
          </div>
        </div>

        {/* ══ RIGHT — summary (2/5) ═══════════════════════════════════════════ */}
        <div className="lg:col-span-2 space-y-4">

          {/* Net Monthly Income card */}
          <SectionCard className="bg-blue-50 border-blue-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-500 mb-1">
              Net Monthly Income
            </p>
            {netMonthlyIncome > 0 ? (
              <>
                <p className="text-3xl font-bold text-blue-700">{fmt(netMonthlyIncome)}</p>
                <p className="text-xs text-blue-500 mt-1">from Pension Planner (after tax, NI &amp; pension)</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-blue-300">—</p>
                <p className="text-xs text-blue-400 mt-1">
                  Enter your salary on the Pension Planner tab to see your net income here.
                </p>
              </>
            )}
          </SectionCard>

          {/* Monthly totals */}
          {(expenditures.length > 0 || debts.length > 0 || savings.length > 0) && (
            <SectionCard>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Monthly Totals
              </p>
              <div className="space-y-2">
                {expenditures.length > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Combined expenditure</span>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(combined)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                      <span className="text-sm font-medium text-slate-700">My committed spend (bills)</span>
                      <span className="text-sm font-bold text-blue-700 tabular-nums">{fmt(p1Total)}</span>
                    </div>
                  </>
                )}
                {debts.length > 0 && (
                  <div className={`flex justify-between items-center ${expenditures.length > 0 ? 'border-t border-slate-100 pt-2' : ''}`}>
                    <span className="text-sm font-medium text-slate-700">Debt repayments</span>
                    <span className="text-sm font-bold text-slate-900 tabular-nums">{fmt(debtMonthlyTotal)}</span>
                  </div>
                )}
                {savings.length > 0 && (
                  <div className={`flex justify-between items-center ${(expenditures.length > 0 || debts.length > 0) ? 'border-t border-slate-100 pt-2' : ''}`}>
                    <span className="text-sm font-medium text-slate-700">Monthly savings</span>
                    <span className="text-sm font-bold text-emerald-700 tabular-nums">{fmt(savingsTotal)}</span>
                  </div>
                )}
                {(expenditures.length > 0 || debts.length > 0) && savings.length > 0 && (
                  <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                    <span className="text-sm font-semibold text-slate-800">Total outgoings (bills + debt + savings)</span>
                    <span className="text-sm font-bold text-slate-900 tabular-nums">{fmt(p1CommittedTotal)}</span>
                  </div>
                )}
                {expenditures.length > 0 && debts.length > 0 && savings.length === 0 && (
                  <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                    <span className="text-sm font-semibold text-slate-800">Total outgoings (bills + debt)</span>
                    <span className="text-sm font-bold text-slate-900 tabular-nums">{fmt(p1CommittedTotal)}</span>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* Remaining income */}
          {(expenditures.length > 0 || debts.length > 0 || savings.length > 0) && (
            <SectionCard>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Money left after bills, debt &amp; savings
              </p>

              {netMonthlyIncome <= 0 && (
                <p className="text-xs text-slate-400 italic mb-3">
                  Add your salary on the Pension tab to see remaining income.
                </p>
              )}

              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Remaining</span>
                <span className={`text-2xl font-bold tabular-nums
                  ${p1Remain >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {fmt(p1Remain)}
                </span>
              </div>

              {netMonthlyIncome > 0 && (
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${p1Remain >= 0 ? 'bg-green-500' : 'bg-red-400'}`}
                    style={{ width: `${Math.min(100, Math.max(0, (p1Remain / netMonthlyIncome) * 100))}%` }}
                  />
                </div>
              )}

              {p1Remain < 0 && (
                <p className="text-xs text-red-500 mt-2 font-medium">
                  Your outgoings exceed net monthly income.
                </p>
              )}
            </SectionCard>
          )}

          {/* Sign-in nudge for unauthenticated users */}
          {!user && (expenditures.length > 0 || debts.length > 0 || savings.length > 0) && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <p className="text-xs font-semibold text-amber-700 mb-1">Data stored locally</p>
              <p className="text-xs text-amber-600">
                Sign in to save your budget to your account and access it from any device.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
