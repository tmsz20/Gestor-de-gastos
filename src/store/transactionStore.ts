import { create } from 'zustand';
import type { Transaction, Category } from '@/domain/models';
import { db } from '@/db/database';
import {
  parseDate,
  toISODate,
  spentOnDay,
  spentInPeriod,
  spentByCategoryInPeriod,
  getCurrentPeriod,
  todayDate,
} from '@/domain/calculator';

// ── Tipos ───────────────────────────────────────────────────

interface TransactionState {
  transactions: Transaction[];
  isHydrated: boolean;

  // Acciones
  hydrate: () => Promise<void>;
  addTransaction: (data: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Omit<Transaction, 'id'>>) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
}

// ── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
}

// ── Selectores (queries) ────────────────────────────────────

export function selectTransactions(state?: TransactionState): Transaction[] {
  const s = state || useTransactionStore.getState();
  return s.transactions;
}

export function selectTodayTransactions(state?: TransactionState): Transaction[] {
  const s = state || useTransactionStore.getState();
  const today = toISODate(todayDate());
  return s.transactions.filter((t) => t.date === today);
}

export function selectPeriodTransactions(payDayOrState: any, stateOrUndefined?: any): Transaction[] {
  let state: TransactionState;
  let payDay: number;
  if (typeof payDayOrState === 'object' && payDayOrState !== null && 'transactions' in payDayOrState) {
    state = payDayOrState;
    payDay = stateOrUndefined;
  } else {
    state = useTransactionStore.getState();
    payDay = payDayOrState;
  }
  const period = getCurrentPeriod(todayDate(), payDay);
  return state.transactions.filter((t) => {
    const d = parseDate(t.date);
    return d >= period.start && d <= period.end;
  });
}

export function selectCategoryTransactions(categoryOrState: any, stateOrUndefined?: any): Transaction[] {
  let state: TransactionState;
  let category: Category;
  if (typeof categoryOrState === 'object' && categoryOrState !== null && 'transactions' in categoryOrState) {
    state = categoryOrState;
    category = stateOrUndefined;
  } else {
    state = useTransactionStore.getState();
    category = categoryOrState;
  }
  return state.transactions.filter((t) => t.category === category);
}

export function selectSpentToday(state?: TransactionState): number {
  const s = state || useTransactionStore.getState();
  return spentOnDay(s.transactions, todayDate());
}

export function selectSpentPeriod(payDayOrState: any, stateOrUndefined?: any): number {
  let state: TransactionState;
  let payDay: number;
  if (typeof payDayOrState === 'object' && payDayOrState !== null && 'transactions' in payDayOrState) {
    state = payDayOrState;
    payDay = stateOrUndefined;
  } else {
    state = useTransactionStore.getState();
    payDay = payDayOrState;
  }
  const period = getCurrentPeriod(todayDate(), payDay);
  return spentInPeriod(state.transactions, period);
}

export function selectSpentCategoryPeriod(categoryOrState: any, payDayOrCategory?: any, stateOrUndefined?: any): number {
  let state: TransactionState;
  let category: Category;
  let payDay: number;
  if (typeof categoryOrState === 'object' && categoryOrState !== null && 'transactions' in categoryOrState) {
    state = categoryOrState;
    category = payDayOrCategory;
    payDay = stateOrUndefined;
  } else {
    state = useTransactionStore.getState();
    category = categoryOrState;
    payDay = payDayOrCategory;
  }
  const period = getCurrentPeriod(todayDate(), payDay);
  return spentByCategoryInPeriod(state.transactions, category, period);
}

// ── Store ───────────────────────────────────────────────────

export const useTransactionStore = create<TransactionState>()((set) => ({
  transactions: [],
  isHydrated: false,

  hydrate: async () => {
    const transactions = await db.transactions.orderBy('date').reverse().toArray();
    set({ transactions, isHydrated: true });
  },

  addTransaction: async (data) => {
    const transaction: Transaction = {
      id: generateId(),
      ...data,
    };
    await db.transactions.add(transaction);
    set((s) => ({
      transactions: [transaction, ...s.transactions],
    }));
  },

  updateTransaction: async (id, data) => {
    await db.transactions.update(id, data);
    set((s) => ({
      transactions: s.transactions.map((t) =>
        t.id === id ? { ...t, ...data } : t,
      ),
    }));
  },

  removeTransaction: async (id) => {
    await db.transactions.delete(id);
    set((s) => ({
      transactions: s.transactions.filter((t) => t.id !== id),
    }));
  },
}));
