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

const BLANK_FORM = { name: '', amount: '', partner1Pct: '100' };

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
  const [showForm, setShowForm]         = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [formValues, setFormValues]     = useState(BLANK_FORM);
  const [errors, setErrors]             = useState({});
  const [flashId, setFlashId]           = useState(null);
  const [syncing, setSyncing]           = useState(false);

  // Prevent the Supabase loader running twice for the same user
  const loadedForUser = useRef(null);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      // Logged in: load from Supabase (skip if already loaded for this user)
      if (loadedForUser.current === user.id) return;
      setSyncing(true);
      supabase
        .from('budget_expenditures')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
        .then(({ data }) => {
          if (data) {
            const rows = data.map((r) => ({
              id:          r.id,
              name:        r.name,
              amount:      r.amount,
              partner1Pct: r.partner1_pct,
            }));
            setExpenditures(rows);
            // Sync to localStorage too
            localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
          }
          loadedForUser.current = user.id;
          setSyncing(false);
        });
    } else {
      // Logged out: load from localStorage
      loadedForUser.current = null;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setExpenditures(JSON.parse(saved));
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

  // ── Derived calculations ──────────────────────────────────────────────────
  const p1Amount = (exp) => r2((exp.partner1Pct / 100) * exp.amount);
  const p1Total  = r2(expenditures.reduce((s, e) => s + p1Amount(e), 0));
  const combined = r2(expenditures.reduce((s, e) => s + (e.amount ?? 0), 0));
  const p1Remain = r2(netMonthlyIncome - p1Total);

  // ── Supabase write helpers ────────────────────────────────────────────────
  const dbUpsert = useCallback(async (entry, sortOrder) => {
    if (!user) return;
    await supabase.from('budget_expenditures').upsert({
      id:          entry.id,
      user_id:     user.id,
      name:        entry.name,
      amount:      entry.amount,
      partner1_pct: entry.partner1Pct,
      sort_order:  sortOrder,
    }, { onConflict: 'id' });
  }, [user]);

  const dbDelete = useCallback(async (id) => {
    if (!user) return;
    await supabase.from('budget_expenditures').delete().eq('id', id);
  }, [user]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setFormValues(BLANK_FORM);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (exp) => {
    setEditingId(exp.id);
    setFormValues({
      name:        exp.name,
      amount:      String(exp.amount),
      partner1Pct: String(exp.partner1Pct),
    });
    setErrors({});
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setErrors({});
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

  const validate = useCallback(() => {
    const errs = {};
    if (!formValues.name.trim()) errs.name = 'Please enter an expenditure name.';
    const amt = parseFloat(formValues.amount);
    if (!formValues.amount || isNaN(amt) || amt <= 0) errs.amount = 'Please enter a positive amount.';
    const pct = parseFloat(formValues.partner1Pct);
    if (isNaN(pct) || pct < 0 || pct > 100) errs.partner1Pct = 'Percentage must be 0–100.';
    return errs;
  }, [formValues]);

  const saveForm = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const entry = {
      id:          editingId ?? uid(),
      name:        formValues.name.trim(),
      amount:      r2(parseFloat(formValues.amount)),
      partner1Pct: r2(parseFloat(formValues.partner1Pct)),
    };

    let nextList;
    setExpenditures((prev) => {
      nextList = editingId
        ? prev.map((e) => (e.id === editingId ? entry : e))
        : [...prev, entry];
      return nextList;
    });

    // Persist to Supabase
    const sortOrder = nextList ? nextList.findIndex((e) => e.id === entry.id) : 0;
    await dbUpsert(entry, sortOrder);

    setFlashId(entry.id);
    setTimeout(() => setFlashId(null), 1200);
    cancelForm();
  };

  const deleteEntry = async (id) => {
    setExpenditures((prev) => prev.filter((e) => e.id !== id));
    await dbDelete(id);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Household Budget</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Track your committed monthly expenditures and see what you have left.
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* ══ LEFT — expenditure list (3/5) ══════════════════════════════════ */}
        <div className="lg:col-span-3 space-y-4">

          {/* Add button */}
          {!showForm && (
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
                         text-white text-sm font-medium rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Expenditure
            </button>
          )}

          {/* ── Add / Edit form ── */}
          {showForm && (
            <SectionCard>
              <h3 className="text-base font-semibold text-slate-900 mb-4">
                {editingId ? 'Edit Expenditure' : 'New Expenditure'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="sm:col-span-2">
                  <Label htmlFor="exp-name">Expenditure Name</Label>
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

          {/* ── Expenditure list ── */}
          {expenditures.length === 0 ? (
            <SectionCard>
              <p className="text-sm text-slate-400 italic text-center py-6">
                No expenditures yet. Click "Add Expenditure" to get started.
              </p>
            </SectionCard>
          ) : (
            <SectionCard className="p-0 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100
                              text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span className="col-span-5">Name</span>
                <span className="col-span-3 text-right">Total</span>
                <span className="col-span-2 text-right">My Share</span>
                <span className="col-span-2 text-right">My %</span>
              </div>

              {/* Rows */}
              {expenditures.map((exp) => (
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
              ))}

              {/* Totals row */}
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200">
                <span className="col-span-5 text-sm font-semibold text-slate-700">Total</span>
                <span className="col-span-3 text-sm font-bold text-slate-900 text-right tabular-nums">{fmt(combined)}</span>
                <span className="col-span-2 text-sm font-bold text-blue-700 text-right tabular-nums">{fmt(p1Total)}</span>
                <span className="col-span-2" />
              </div>
            </SectionCard>
          )}
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

          {/* Expenditure totals */}
          {expenditures.length > 0 && (
            <SectionCard>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Monthly Totals
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Combined expenditure</span>
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(combined)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                  <span className="text-sm font-medium text-slate-700">My committed spend</span>
                  <span className="text-sm font-bold text-blue-700 tabular-nums">{fmt(p1Total)}</span>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Remaining income */}
          {expenditures.length > 0 && (
            <SectionCard>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Remaining After My Bills
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
                  Your committed spend exceeds net monthly income.
                </p>
              )}
            </SectionCard>
          )}

          {/* Sign-in nudge for unauthenticated users */}
          {!user && expenditures.length > 0 && (
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
