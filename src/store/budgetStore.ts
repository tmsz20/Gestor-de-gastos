import { create } from 'zustand';
import type { Budget, FixedExpense, Period } from '@/domain/models';
import {
  getCurrentPeriod,
  totalFixedExpenses,
  variableBudget,
  dailyBudget as calcDailyBudget,
  todayDate,
} from '@/domain/calculator';
import { db } from '@/db/database';

// ── Tipos ───────────────────────────────────────────────────

interface BudgetState {
  // Datos persistidos
  budget: Budget | null;
  fixedExpenses: FixedExpense[];

  // Flags
  isHydrated: boolean;

  // Acciones
  hydrate: () => Promise<void>;
  setBudget: (data: {
    salaryAmount: number;
    payDay: number;
    savingsGoal: number;
  }) => Promise<void>;
  addFixedExpense: (expense: Omit<FixedExpense, 'id'>) => Promise<void>;
  updateFixedExpense: (id: string, data: Partial<Pick<FixedExpense, 'name' | 'amount'>>) => Promise<void>;
  removeFixedExpense: (id: string) => Promise<void>;
}

// ── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
}

// ── Selectores derivados (no son parte del state, se calculan on-demand) ──

export function selectPeriod(state?: BudgetState): Period | null {
  const s = state || useBudgetStore.getState();
  if (!s.budget) return null;
  return getCurrentPeriod(todayDate(), s.budget.payDay);
}

export function selectTotalFixed(state?: BudgetState): number {
  const s = state || useBudgetStore.getState();
  return totalFixedExpenses(s.fixedExpenses);
}

export function selectVariableBudget(state?: BudgetState): number | null {
  const s = state || useBudgetStore.getState();
  if (!s.budget) return null;
  const fixed = totalFixedExpenses(s.fixedExpenses);
  return variableBudget(s.budget.salaryAmount, fixed, s.budget.savingsGoal);
}

export function selectDailyBudget(state?: BudgetState): number | null {
  const s = state || useBudgetStore.getState();
  if (!s.budget) return null;
  const period = getCurrentPeriod(todayDate(), s.budget.payDay);
  const fixed = totalFixedExpenses(s.fixedExpenses);
  const variable = variableBudget(s.budget.salaryAmount, fixed, s.budget.savingsGoal);
  return calcDailyBudget(variable, period.days);
}

// ── Store ───────────────────────────────────────────────────

export const useBudgetStore = create<BudgetState>()((set, get) => ({
  budget: null,
  fixedExpenses: [],
  isHydrated: false,

  hydrate: async () => {
    const [budgets, expenses] = await Promise.all([
      db.budgets.toArray(),
      db.fixedExpenses.toArray(),
    ]);
    set({
      budget: budgets[0] ?? null,
      fixedExpenses: expenses,
      isHydrated: true,
    });
  },

  setBudget: async (data) => {
    const existing = get().budget;
    const now = new Date().toISOString();
    const budget: Budget = {
      id: existing?.id ?? generateId(),
      salaryAmount: data.salaryAmount,
      payDay: data.payDay,
      savingsGoal: data.savingsGoal,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await db.budgets.put(budget);
    set({ budget });
  },

  addFixedExpense: async (expense) => {
    const newExpense: FixedExpense = {
      id: generateId(),
      ...expense,
    };
    await db.fixedExpenses.add(newExpense);
    set((s) => ({ fixedExpenses: [...s.fixedExpenses, newExpense] }));
  },

  updateFixedExpense: async (id, data) => {
    await db.fixedExpenses.update(id, data);
    set((s) => ({
      fixedExpenses: s.fixedExpenses.map((e) =>
        e.id === id ? { ...e, ...data } : e,
      ),
    }));
  },

  removeFixedExpense: async (id) => {
    await db.fixedExpenses.delete(id);
    set((s) => ({
      fixedExpenses: s.fixedExpenses.filter((e) => e.id !== id),
    }));
  },
}));
