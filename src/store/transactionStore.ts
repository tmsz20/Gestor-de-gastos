import { create } from 'zustand';
import type { Transaction, Category } from '@/domain/models';
import { db } from '@/db/database';
import {
  parseDate,
  toISODate,
  spentOnDay,
  spentInPeriod,
  spentByCategoryInPeriod,
} from '@/domain/calculator';
import { getCurrentPeriod } from '@/domain/calculator';

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

function todayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function generateId(): string {
  return crypto.randomUUID();
}

// ── Selectores (queries) ────────────────────────────────────

export function selectTransactions(): Transaction[] {
  return useTransactionStore.getState().transactions;
}

export function selectTodayTransactions(): Transaction[] {
  const state = useTransactionStore.getState();
  const today = toISODate(todayDate());
  return state.transactions.filter((t) => t.date === today);
}

export function selectPeriodTransactions(payDay: number): Transaction[] {
  const state = useTransactionStore.getState();
  const period = getCurrentPeriod(todayDate(), payDay);
  return state.transactions.filter((t) => {
    const d = parseDate(t.date);
    return d >= period.start && d <= period.end;
  });
}

export function selectCategoryTransactions(category: Category): Transaction[] {
  return useTransactionStore.getState().transactions.filter(
    (t) => t.category === category,
  );
}

export function selectSpentToday(): number {
  return spentOnDay(useTransactionStore.getState().transactions, todayDate());
}

export function selectSpentPeriod(payDay: number): number {
  const state = useTransactionStore.getState();
  const period = getCurrentPeriod(todayDate(), payDay);
  return spentInPeriod(state.transactions, period);
}

export function selectSpentCategoryPeriod(category: Category, payDay: number): number {
  const state = useTransactionStore.getState();
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
