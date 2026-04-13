/**
 * BudgetProvider — state + sync for the budget feature (Supabase + localStorage mirror).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { calculateAmortizingMonthlyPayment } from '../../../utils/debt';
import {
  SECTION_FIXED,
  SECTION_NICE,
  createDefaultExpenditures,
  normalizeCreditCardRow,
  normalizeExpenditureRow,
} from '../domain/expenditures';
import { computeGoalDerived } from '../domain/goalDerived';
import { normalizeGoalSavingRow } from '../domain/goalRows';
import {
  STORAGE_KEY,
  STORAGE_KEY_DEBTS,
  STORAGE_KEY_SAVINGS,
  STORAGE_KEY_CREDIT_CARDS,
  STORAGE_KEY_UNEXPECTED_BUFFER,
  STORAGE_KEY_GOAL_SAVINGS,
} from '../persistence/keys';
import {
  fetchBudgetDataBundle,
  upsertExpenditureRow,
  deleteExpenditureRow,
  upsertDebtRow,
  deleteDebtRow,
  upsertSavingRow,
  deleteSavingRow,
  upsertCreditCardRow,
  deleteCreditCardRow,
  upsertGoalSavingRow,
  deleteGoalSavingRow,
  upsertUnexpectedBuffer,
} from '../persistence/budgetSync';
import { EditIcon, DeleteIcon } from '../components/BudgetPrimitives';
import { HouseholdCostsSection } from '../components/HouseholdCostsSection';
import { DebtsSection } from '../components/DebtsSection';
import { CreditCardsSection } from '../components/CreditCardsSection';
import { PlannedSavingsSection } from '../components/PlannedSavingsSection';
import { SavingsGoalsSection } from '../components/SavingsGoalsSection';
import { BudgetHeader } from '../components/BudgetHeader';
import { BudgetSyncErrorBanner } from '../components/BudgetSyncErrorBanner';
import { BudgetSummaryPanel } from '../components/BudgetSummaryPanel';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = (value) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);

const r2 = (n) => Math.round((n ?? 0) * 100) / 100;

const BLANK_FORM = { name: '', amount: '0', partner1Pct: '100', section: SECTION_FIXED };
const BLANK_DEBT_FORM = { name: '', principal: '', annualRate: '', termYears: '' };
const BLANK_SAVINGS_FORM = { name: '', amount: '' };
const BLANK_CREDIT_CARD_FORM = {
  name: '',
  totalBalance: '',
  minimumMonthlyPayment: '',
  apr: '',
  notes: '',
};
const BLANK_GOAL_FORM = {
  name: '',
  targetAmount: '',
  currentSavedAmount: '',
  chosenMonthlyContribution: '',
  committedMonthlyContribution: '',
};

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── provider ────────────────────────────────────────────────────────────────

export function BudgetProvider({ netMonthlyIncome = 0, user = null }) {
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

  const [creditCards, setCreditCards]                     = useState([]);
  const [showCreditCardForm, setShowCreditCardForm]     = useState(false);
  const [editingCreditCardId, setEditingCreditCardId]   = useState(null);
  const [creditCardFormValues, setCreditCardFormValues] = useState(BLANK_CREDIT_CARD_FORM);
  const [creditCardErrors, setCreditCardErrors]         = useState({});
  const [flashCreditCardId, setFlashCreditCardId]       = useState(null);

  const [unexpectedSpendingBuffer, setUnexpectedSpendingBuffer] = useState(0);

  const [goalSavings, setGoalSavings]                     = useState([]);
  const [showGoalForm, setShowGoalForm]                   = useState(false);
  const [editingGoalId, setEditingGoalId]                 = useState(null);
  const [goalFormValues, setGoalFormValues]               = useState(BLANK_GOAL_FORM);
  const [goalErrors, setGoalErrors]                       = useState({});
  const [flashGoalId, setFlashGoalId]                     = useState(null);

  // Prevent the Supabase loader running twice for the same user
  const loadedForUser = useRef(null);

  const dbUpsert = useCallback(async (entry, sortOrder) => {
    if (!user) return;
    await upsertExpenditureRow(user.id, entry, sortOrder);
  }, [user]);

  const dbDelete = useCallback(async (id) => {
    if (!user) return;
    await deleteExpenditureRow(id);
  }, [user]);

  const dbUpsertDebt = useCallback(async (entry, sortOrder) => {
    if (!user) return;
    await upsertDebtRow(user.id, entry, sortOrder);
  }, [user]);

  const dbDeleteDebt = useCallback(async (id) => {
    if (!user) return;
    await deleteDebtRow(id);
  }, [user]);

  const dbUpsertSaving = useCallback(async (entry, sortOrder) => {
    if (!user) return;
    await upsertSavingRow(user.id, entry, sortOrder);
  }, [user]);

  const dbDeleteSaving = useCallback(async (id) => {
    if (!user) return;
    await deleteSavingRow(id);
  }, [user]);

  const dbUpsertCreditCard = useCallback(async (entry, sortOrder) => {
    if (!user) return;
    await upsertCreditCardRow(user.id, entry, sortOrder);
  }, [user]);

  const dbDeleteCreditCard = useCallback(async (id) => {
    if (!user) return;
    await deleteCreditCardRow(id);
  }, [user]);

  const dbUpsertGoalSaving = useCallback(async (entry, sortOrder) => {
    if (!user) return;
    await upsertGoalSavingRow(user.id, entry, sortOrder);
  }, [user]);

  const dbDeleteGoalSaving = useCallback(async (id) => {
    if (!user) return;
    await deleteGoalSavingRow(id);
  }, [user]);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      if (loadedForUser.current === user.id) return;
      setSyncing(true);
      fetchBudgetDataBundle(user.id).then(async ([expRes, debtRes, savRes, ccRes, settingsRes, goalRes]) => {
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

        if (ccRes.data) {
          const ccRows = ccRes.data.map((r) => normalizeCreditCardRow(r));
          setCreditCards(ccRows);
          localStorage.setItem(STORAGE_KEY_CREDIT_CARDS, JSON.stringify(ccRows));
        }

        let bufferAmt = 0;
        if (settingsRes.data && settingsRes.data.unexpected_spending_buffer != null) {
          bufferAmt = r2(Math.max(0, Number(settingsRes.data.unexpected_spending_buffer)));
        } else {
          try {
            const rawBuf = localStorage.getItem(STORAGE_KEY_UNEXPECTED_BUFFER);
            if (rawBuf != null) bufferAmt = r2(Math.max(0, Number(JSON.parse(rawBuf))));
          } catch {
            // ignore
          }
        }
        setUnexpectedSpendingBuffer(bufferAmt);
        localStorage.setItem(STORAGE_KEY_UNEXPECTED_BUFFER, JSON.stringify(bufferAmt));

        if (goalRes.data) {
          const grows = goalRes.data.map((r) =>
            normalizeGoalSavingRow({
              id: r.id,
              name: r.name ?? '',
              targetAmount: Number(r.target_amount),
              currentSavedAmount: Number(r.current_saved_amount ?? 0),
              chosenMonthlyContribution: Number(r.chosen_monthly_contribution ?? 0),
              committed: r.committed,
              committedMonthlyContribution: Number(r.committed_monthly_contribution ?? 0),
            }),
          );
          setGoalSavings(grows);
          localStorage.setItem(STORAGE_KEY_GOAL_SAVINGS, JSON.stringify(grows));
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

      try {
        const savedCc = localStorage.getItem(STORAGE_KEY_CREDIT_CARDS);
        if (savedCc) {
          const parsed = JSON.parse(savedCc);
          if (Array.isArray(parsed)) {
            setCreditCards(parsed.map((r) => normalizeCreditCardRow(r)));
          }
        }
      } catch {
        // ignore corrupt data
      }

      try {
        const rawBuf = localStorage.getItem(STORAGE_KEY_UNEXPECTED_BUFFER);
        if (rawBuf != null) {
          const b = r2(Math.max(0, Number(JSON.parse(rawBuf))));
          setUnexpectedSpendingBuffer(b);
        }
      } catch {
        // ignore
      }

      try {
        const rawGoals = localStorage.getItem(STORAGE_KEY_GOAL_SAVINGS);
        if (rawGoals) {
          const parsed = JSON.parse(rawGoals);
          if (Array.isArray(parsed)) setGoalSavings(parsed.map(normalizeGoalSavingRow));
        }
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CREDIT_CARDS, JSON.stringify(creditCards));
  }, [creditCards]);

  useEffect(() => {
    if (user && loadedForUser.current !== user.id) return;
    localStorage.setItem(STORAGE_KEY_UNEXPECTED_BUFFER, JSON.stringify(unexpectedSpendingBuffer));
  }, [unexpectedSpendingBuffer, user?.id]);

  useEffect(() => {
    if (user && loadedForUser.current !== user.id) return;
    localStorage.setItem(STORAGE_KEY_GOAL_SAVINGS, JSON.stringify(goalSavings));
  }, [goalSavings, user?.id]);

  useEffect(() => {
    if (!user || syncing) return;
    let cancelled = false;
    (async () => {
      try {
        await upsertUnexpectedBuffer(user.id, unexpectedSpendingBuffer);
        if (!cancelled) setSyncError(null);
      } catch {
        if (!cancelled) {
          setSyncError('Could not save buffer to your account. Check your connection and try again.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [unexpectedSpendingBuffer, user, syncing]);

  // ── Derived calculations ──────────────────────────────────────────────────
  const p1Amount = (exp) => r2((exp.partner1Pct / 100) * exp.amount);
  const p1Total  = r2(expenditures.reduce((s, e) => s + p1Amount(e), 0));
  const combined = r2(expenditures.reduce((s, e) => s + (e.amount ?? 0), 0));

  const debtMonthly = (d) =>
    calculateAmortizingMonthlyPayment(d.principal, d.annualRatePct, d.termMonths);
  const debtMonthlyTotal = r2(debts.reduce((s, d) => s + debtMonthly(d), 0));
  const explicitSavingsTotal = r2(savings.reduce((s, v) => s + (v.amount ?? 0), 0));
  const committedGoalsMonthlyTotal = r2(
    goalSavings
      .filter((g) => g.committed)
      .reduce((s, g) => s + (g.committedMonthlyContribution ?? 0), 0),
  );
  const savingsTotal = r2(explicitSavingsTotal + committedGoalsMonthlyTotal);
  const creditCardMinimumTotal = r2(
    creditCards.reduce((s, c) => s + (c.minimumMonthlyPayment ?? 0), 0),
  );
  const p1CommittedTotal = r2(
    p1Total + debtMonthlyTotal + savingsTotal + creditCardMinimumTotal,
  );

  const p1Remain = r2(
    netMonthlyIncome -
      p1Total -
      debtMonthlyTotal -
      savingsTotal -
      creditCardMinimumTotal,
  );

  // Post-outgoings remainder; soft buffer is applied below (not in p1CommittedTotal).
  const baseLeftover = p1Remain;
  // availableForGoals: hook for future goal-saving UI
  const availableForGoals = r2(Math.max(0, baseLeftover - unexpectedSpendingBuffer));

  const fixedExpenditures = expenditures.filter((e) => e.section === SECTION_FIXED);
  const niceExpenditures = expenditures.filter((e) => e.section === SECTION_NICE);

  const fixedCombined = r2(fixedExpenditures.reduce((s, e) => s + (e.amount ?? 0), 0));
  const fixedP1Total = r2(fixedExpenditures.reduce((s, e) => s + p1Amount(e), 0));
  const niceCombined = r2(niceExpenditures.reduce((s, e) => s + (e.amount ?? 0), 0));
  const niceP1Total = r2(niceExpenditures.reduce((s, e) => s + p1Amount(e), 0));

  // ── Form helpers ──────────────────────────────────────────────────────────
  const openAddExpenditure = (section) => {
    setShowDebtForm(false);
    setShowCreditCardForm(false);
    setShowGoalForm(false);
    setEditingGoalId(null);
    setEditingCreditCardId(null);
    setEditingDebtId(null);
    setEditingId(null);
    setFormValues({ ...BLANK_FORM, section });
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (exp) => {
    setShowDebtForm(false);
    setShowCreditCardForm(false);
    setShowGoalForm(false);
    setEditingGoalId(null);
    setEditingCreditCardId(null);
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
    setShowCreditCardForm(false);
    setShowGoalForm(false);
    setEditingGoalId(null);
    setEditingCreditCardId(null);
    setEditingId(null);
    setEditingDebtId(null);
    setDebtFormValues(BLANK_DEBT_FORM);
    setDebtErrors({});
    setShowDebtForm(true);
  };

  const openEditDebt = (d) => {
    setShowForm(false);
    setShowCreditCardForm(false);
    setShowGoalForm(false);
    setEditingGoalId(null);
    setEditingCreditCardId(null);
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
    setShowCreditCardForm(false);
    setShowGoalForm(false);
    setEditingGoalId(null);
    setEditingCreditCardId(null);
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
    setShowCreditCardForm(false);
    setShowGoalForm(false);
    setEditingGoalId(null);
    setEditingCreditCardId(null);
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

  const openAddCreditCard = () => {
    setShowForm(false);
    setShowDebtForm(false);
    setShowSavingsForm(false);
    setShowGoalForm(false);
    setEditingGoalId(null);
    setEditingId(null);
    setEditingDebtId(null);
    setEditingSavingId(null);
    setEditingCreditCardId(null);
    setCreditCardFormValues(BLANK_CREDIT_CARD_FORM);
    setCreditCardErrors({});
    setShowCreditCardForm(true);
  };

  const openEditCreditCard = (cc) => {
    setShowForm(false);
    setShowDebtForm(false);
    setShowSavingsForm(false);
    setShowGoalForm(false);
    setEditingGoalId(null);
    setEditingId(null);
    setEditingDebtId(null);
    setEditingSavingId(null);
    setEditingCreditCardId(cc.id);
    setCreditCardFormValues({
      name: cc.name || '',
      totalBalance: String(cc.totalBalance ?? 0),
      minimumMonthlyPayment: String(cc.minimumMonthlyPayment ?? 0),
      apr: cc.apr != null ? String(cc.apr) : '',
      notes: cc.notes || '',
    });
    setCreditCardErrors({});
    setShowCreditCardForm(true);
  };

  const cancelCreditCardForm = () => {
    setShowCreditCardForm(false);
    setEditingCreditCardId(null);
    setCreditCardErrors({});
  };

  const openAddGoal = () => {
    setShowForm(false);
    setShowDebtForm(false);
    setShowSavingsForm(false);
    setShowCreditCardForm(false);
    setEditingId(null);
    setEditingDebtId(null);
    setEditingSavingId(null);
    setEditingCreditCardId(null);
    setEditingGoalId(null);
    setGoalFormValues(BLANK_GOAL_FORM);
    setGoalErrors({});
    setShowGoalForm(true);
  };

  const openEditGoal = (g) => {
    setShowForm(false);
    setShowDebtForm(false);
    setShowSavingsForm(false);
    setShowCreditCardForm(false);
    setEditingId(null);
    setEditingDebtId(null);
    setEditingSavingId(null);
    setEditingCreditCardId(null);
    setEditingGoalId(g.id);
    setGoalFormValues({
      name:                    g.name || '',
      targetAmount:            String(g.targetAmount ?? 0),
      currentSavedAmount:      g.currentSavedAmount > 0 ? String(g.currentSavedAmount) : '',
      chosenMonthlyContribution:
        g.chosenMonthlyContribution > 0 ? String(g.chosenMonthlyContribution) : '',
      committedMonthlyContribution:
        g.committed ? String(g.committedMonthlyContribution ?? 0) : '',
    });
    setGoalErrors({});
    setShowGoalForm(true);
  };

  const cancelGoalForm = () => {
    setShowGoalForm(false);
    setEditingGoalId(null);
    setGoalErrors({});
  };

  const handleGoalFormChange = (field, value) => {
    setGoalFormValues((prev) => ({ ...prev, [field]: value }));
    setGoalErrors((prev) => ({ ...prev, [field]: undefined }));
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

  const handleCreditCardFormChange = (field, value) => {
    setCreditCardFormValues((prev) => ({ ...prev, [field]: value }));
    setCreditCardErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = useCallback(() => {
    const errs = {};
    if (!formValues.name.trim()) errs.name = 'Please enter a cost name.';
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

  const validateCreditCard = useCallback(() => {
    const errs = {};
    const bal = parseFloat(creditCardFormValues.totalBalance);
    if (creditCardFormValues.totalBalance === '' || isNaN(bal) || bal < 0) {
      errs.totalBalance = 'Enter zero or a positive balance.';
    }
    const minPay = parseFloat(creditCardFormValues.minimumMonthlyPayment);
    if (
      creditCardFormValues.minimumMonthlyPayment === '' ||
      isNaN(minPay) ||
      minPay < 0
    ) {
      errs.minimumMonthlyPayment = 'Enter zero or a positive minimum payment.';
    }
    if (creditCardFormValues.apr !== '') {
      const ar = parseFloat(creditCardFormValues.apr);
      if (isNaN(ar) || ar < 0) {
        errs.apr = 'Enter zero or a positive rate, or leave blank.';
      }
    }
    return errs;
  }, [creditCardFormValues]);

  const validateGoal = useCallback(() => {
    const errs = {};
    const prev = editingGoalId ? goalSavings.find((x) => x.id === editingGoalId) : null;
    if (!goalFormValues.name.trim()) {
      errs.name = 'Enter a goal name.';
    }
    const target = parseFloat(goalFormValues.targetAmount);
    if (goalFormValues.targetAmount === '' || isNaN(target) || target <= 0) {
      errs.targetAmount = 'Enter a target greater than zero.';
    }
    const curRaw = goalFormValues.currentSavedAmount;
    if (curRaw !== '' && curRaw != null) {
      const cur = parseFloat(curRaw);
      if (isNaN(cur) || cur < 0) {
        errs.currentSavedAmount = 'Enter zero or a positive amount.';
      }
    }
    const chRaw = goalFormValues.chosenMonthlyContribution;
    if (chRaw !== '' && chRaw != null) {
      const ch = parseFloat(chRaw);
      if (isNaN(ch) || ch < 0) {
        errs.chosenMonthlyContribution = 'Enter zero or a positive amount.';
      }
    }
    if (prev?.committed) {
      const cmRaw = goalFormValues.committedMonthlyContribution;
      if (cmRaw === '' || cmRaw == null) {
        errs.committedMonthlyContribution = 'Enter the monthly amount in your plan.';
      } else {
        const cm = parseFloat(cmRaw);
        if (isNaN(cm) || cm < 0) {
          errs.committedMonthlyContribution = 'Enter zero or a positive amount.';
        }
      }
    }
    return errs;
  }, [goalFormValues, editingGoalId, goalSavings]);

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
        className={`flex items-start justify-between gap-3 border-b border-slate-100/90 px-4 py-3.5 last:border-0
                    transition-colors duration-200
                    ${flashId === exp.id ? 'bg-emerald-50/60' : 'hover:bg-slate-50/90'}`}
      >
        <div className="min-w-0 flex-1 pr-2">
          <p className="truncate text-sm font-medium text-slate-800">{exp.name}</p>
          <p className="mt-0.5 text-xs tabular-nums text-slate-500">
            {fmt(exp.amount)} total · {exp.partner1Pct}% your share
          </p>
        </div>
        <p className="shrink-0 text-right text-lg font-semibold tracking-tight tabular-nums text-slate-900">
          {fmt(p1Amount(exp))}
        </p>
        <div className="flex shrink-0 items-start gap-0.5 pt-0.5">
          <button
            type="button"
            aria-label={`Edit ${exp.name}`}
            onClick={() => openEdit(exp)}
            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <EditIcon />
          </button>
          <button
            type="button"
            aria-label={`Delete ${exp.name}`}
            onClick={() => deleteEntry(exp.id)}
            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-500"
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

  const saveCreditCardForm = async () => {
    const errs = validateCreditCard();
    if (Object.keys(errs).length) {
      setCreditCardErrors(errs);
      return;
    }

    const totalBalance = r2(parseFloat(creditCardFormValues.totalBalance));
    const minimumMonthlyPayment = r2(parseFloat(creditCardFormValues.minimumMonthlyPayment));
    let apr;
    if (creditCardFormValues.apr !== '') {
      const ar = parseFloat(creditCardFormValues.apr);
      if (!isNaN(ar)) apr = r2(ar);
    }

    const entry = {
      id: editingCreditCardId ?? uid(),
      name: creditCardFormValues.name.trim(),
      totalBalance,
      minimumMonthlyPayment,
      ...(apr != null ? { apr } : {}),
      notes: creditCardFormValues.notes.trim(),
    };

    let nextList;
    setCreditCards((prev) => {
      nextList = editingCreditCardId
        ? prev.map((c) => (c.id === editingCreditCardId ? entry : c))
        : [...prev, entry];
      return nextList;
    });

    const sortOrder = nextList ? nextList.findIndex((c) => c.id === entry.id) : 0;
    try {
      await dbUpsertCreditCard(entry, sortOrder);
      setSyncError(null);
    } catch {
      setSyncError('Could not save to your account. Check your connection and try again.');
    }

    setFlashCreditCardId(entry.id);
    setTimeout(() => setFlashCreditCardId(null), 1200);
    cancelCreditCardForm();
  };

  const deleteCreditCardEntry = async (id) => {
    setCreditCards((prev) => prev.filter((c) => c.id !== id));
    try {
      await dbDeleteCreditCard(id);
      setSyncError(null);
    } catch {
      setSyncError('Could not delete from your account. Check your connection and try again.');
    }
  };

  const saveGoalForm = async () => {
    const errs = validateGoal();
    if (Object.keys(errs).length) {
      setGoalErrors(errs);
      return;
    }

    const prev = editingGoalId ? goalSavings.find((x) => x.id === editingGoalId) : null;

    const targetAmount = r2(parseFloat(goalFormValues.targetAmount));
    const currentSavedAmount =
      goalFormValues.currentSavedAmount === ''
        ? 0
        : r2(parseFloat(goalFormValues.currentSavedAmount));
    let chosenMonthlyContribution =
      goalFormValues.chosenMonthlyContribution === ''
        ? 0
        : r2(parseFloat(goalFormValues.chosenMonthlyContribution));

    let committed = Boolean(prev?.committed);
    let committedMonthlyContribution = r2(prev?.committedMonthlyContribution ?? 0);

    if (prev?.committed) {
      committedMonthlyContribution =
        goalFormValues.committedMonthlyContribution === ''
          ? r2(prev.committedMonthlyContribution ?? 0)
          : r2(parseFloat(goalFormValues.committedMonthlyContribution));
      chosenMonthlyContribution = committedMonthlyContribution;
    } else {
      committed = false;
      committedMonthlyContribution = 0;
    }

    const entry = {
      id:                       editingGoalId ?? uid(),
      name:                     goalFormValues.name.trim(),
      targetAmount,
      currentSavedAmount,
      chosenMonthlyContribution,
      committed,
      committedMonthlyContribution,
    };

    let nextList;
    setGoalSavings((prev) => {
      nextList = editingGoalId
        ? prev.map((g) => (g.id === editingGoalId ? entry : g))
        : [...prev, entry];
      return nextList;
    });

    const sortOrder = nextList ? nextList.findIndex((g) => g.id === entry.id) : 0;
    try {
      await dbUpsertGoalSaving(entry, sortOrder);
      setSyncError(null);
    } catch {
      setSyncError('Could not save to your account. Check your connection and try again.');
    }

    setFlashGoalId(entry.id);
    setTimeout(() => setFlashGoalId(null), 1200);
    cancelGoalForm();
  };

  const commitGoal = async (g) => {
    if (g.committed) return;
    const d = computeGoalDerived(availableForGoals, g);
    const snap =
      g.chosenMonthlyContribution > 0
        ? r2(g.chosenMonthlyContribution)
        : d.recommendedMonthlyContribution;
    const chosenAligned =
      g.chosenMonthlyContribution > 0 ? r2(g.chosenMonthlyContribution) : r2(snap);
    const updated = {
      ...g,
      committed: true,
      committedMonthlyContribution: r2(snap),
      chosenMonthlyContribution: chosenAligned,
    };
    let nextList;
    setGoalSavings((prev) => {
      nextList = prev.map((x) => (x.id === g.id ? updated : x));
      return nextList;
    });
    const sortOrder = nextList ? nextList.findIndex((x) => x.id === updated.id) : 0;
    try {
      await dbUpsertGoalSaving(updated, sortOrder);
      setSyncError(null);
    } catch {
      setSyncError('Could not save to your account. Check your connection and try again.');
    }
    setFlashGoalId(updated.id);
    setTimeout(() => setFlashGoalId(null), 1200);
  };

  const uncommitGoal = async (g) => {
    if (!g.committed) return;
    const updated = {
      ...g,
      committed: false,
      committedMonthlyContribution: 0,
    };
    let nextList;
    setGoalSavings((prev) => {
      nextList = prev.map((x) => (x.id === g.id ? updated : x));
      return nextList;
    });
    const sortOrder = nextList ? nextList.findIndex((x) => x.id === updated.id) : 0;
    try {
      await dbUpsertGoalSaving(updated, sortOrder);
      setSyncError(null);
    } catch {
      setSyncError('Could not save to your account. Check your connection and try again.');
    }
    setFlashGoalId(updated.id);
    setTimeout(() => setFlashGoalId(null), 1200);
  };

  const deleteGoalEntry = async (id) => {
    setGoalSavings((prev) => prev.filter((g) => g.id !== id));
    try {
      await dbDeleteGoalSaving(id);
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

  const handleUnexpectedBufferChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      setUnexpectedSpendingBuffer(0);
      return;
    }
    const v = parseFloat(raw);
    if (Number.isNaN(v)) return;
    setUnexpectedSpendingBuffer(r2(Math.max(0, v)));
  };

  const editingGoal = editingGoalId ? goalSavings.find((g) => g.id === editingGoalId) : null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-[#F5F5F7] pb-10 pt-1">
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-5">
      <BudgetHeader syncing={syncing} user={user} />
      <BudgetSyncErrorBanner syncError={syncError} onDismiss={() => setSyncError(null)} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">

        {/* ══ LEFT — planning (3/5); second on mobile ═══════════════════════ */}
        <div className="order-2 space-y-5 lg:order-1 lg:col-span-3">
          <HouseholdCostsSection
            SECTION_FIXED={SECTION_FIXED}
            SECTION_NICE={SECTION_NICE}
            showForm={showForm}
            editingId={editingId}
            formValues={formValues}
            errors={errors}
            handleFormChange={handleFormChange}
            saveForm={saveForm}
            cancelForm={cancelForm}
            fixedExpenditures={fixedExpenditures}
            niceExpenditures={niceExpenditures}
            expenditures={expenditures}
            p1Total={p1Total}
            combined={combined}
            fixedP1Total={fixedP1Total}
            fixedCombined={fixedCombined}
            niceP1Total={niceP1Total}
            niceCombined={niceCombined}
            fmt={fmt}
            renderExpenditureRows={renderExpenditureRows}
            showDebtForm={showDebtForm}
            showCreditCardForm={showCreditCardForm}
            showSavingsForm={showSavingsForm}
            showGoalForm={showGoalForm}
            openAddExpenditure={openAddExpenditure}
          />
          <DebtsSection
            showForm={showForm}
            showDebtForm={showDebtForm}
            showCreditCardForm={showCreditCardForm}
            showSavingsForm={showSavingsForm}
            showGoalForm={showGoalForm}
            editingDebtId={editingDebtId}
            debtFormValues={debtFormValues}
            debtErrors={debtErrors}
            handleDebtFormChange={handleDebtFormChange}
            saveDebtForm={saveDebtForm}
            cancelDebtForm={cancelDebtForm}
            debts={debts}
            debtMonthly={debtMonthly}
            debtMonthlyTotal={debtMonthlyTotal}
            flashDebtId={flashDebtId}
            openAddDebt={openAddDebt}
            openEditDebt={openEditDebt}
            deleteDebtEntry={deleteDebtEntry}
            fmt={fmt}
            r2={r2}
            formatTermLabel={formatTermLabel}
          />
          <CreditCardsSection
            showForm={showForm}
            showDebtForm={showDebtForm}
            showCreditCardForm={showCreditCardForm}
            showSavingsForm={showSavingsForm}
            showGoalForm={showGoalForm}
            editingCreditCardId={editingCreditCardId}
            creditCardFormValues={creditCardFormValues}
            creditCardErrors={creditCardErrors}
            handleCreditCardFormChange={handleCreditCardFormChange}
            saveCreditCardForm={saveCreditCardForm}
            cancelCreditCardForm={cancelCreditCardForm}
            creditCards={creditCards}
            flashCreditCardId={flashCreditCardId}
            openAddCreditCard={openAddCreditCard}
            openEditCreditCard={openEditCreditCard}
            deleteCreditCardEntry={deleteCreditCardEntry}
            creditCardMinimumTotal={creditCardMinimumTotal}
            fmt={fmt}
            r2={r2}
          />
          <PlannedSavingsSection
            savings={savings}
            committedGoalsMonthlyTotal={committedGoalsMonthlyTotal}
            showSavingsForm={showSavingsForm}
            editingSavingId={editingSavingId}
            savingsFormValues={savingsFormValues}
            savingsErrors={savingsErrors}
            handleSavingsFormChange={handleSavingsFormChange}
            saveSavingsForm={saveSavingsForm}
            cancelSavingsForm={cancelSavingsForm}
            flashSavingId={flashSavingId}
            openAddSaving={openAddSaving}
            openEditSaving={openEditSaving}
            deleteSavingEntry={deleteSavingEntry}
            savingsTotal={savingsTotal}
            explicitSavingsTotal={explicitSavingsTotal}
            fmt={fmt}
          />
          <SavingsGoalsSection
            availableForGoals={availableForGoals}
            showGoalForm={showGoalForm}
            editingGoalId={editingGoalId}
            editingGoal={editingGoal}
            goalFormValues={goalFormValues}
            goalErrors={goalErrors}
            handleGoalFormChange={handleGoalFormChange}
            saveGoalForm={saveGoalForm}
            cancelGoalForm={cancelGoalForm}
            goalSavings={goalSavings}
            flashGoalId={flashGoalId}
            openAddGoal={openAddGoal}
            openEditGoal={openEditGoal}
            deleteGoalEntry={deleteGoalEntry}
            commitGoal={commitGoal}
            uncommitGoal={uncommitGoal}
            fmt={fmt}
          />
        </div>


        <BudgetSummaryPanel
          fmt={fmt}
          netMonthlyIncome={netMonthlyIncome}
          p1Remain={p1Remain}
          baseLeftover={baseLeftover}
          fixedP1Total={fixedP1Total}
          niceP1Total={niceP1Total}
          debtMonthlyTotal={debtMonthlyTotal}
          creditCardMinimumTotal={creditCardMinimumTotal}
          savingsTotal={savingsTotal}
          p1CommittedTotal={p1CommittedTotal}
          unexpectedSpendingBuffer={unexpectedSpendingBuffer}
          handleUnexpectedBufferChange={handleUnexpectedBufferChange}
          availableForGoals={availableForGoals}
          user={user}
          expenditures={expenditures}
          debts={debts}
          savings={savings}
          creditCards={creditCards}
          goalSavings={goalSavings}
        />
      </div>
      </div>
    </div>
  );
}
