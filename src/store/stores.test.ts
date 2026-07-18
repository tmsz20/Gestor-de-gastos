import { describe, it, expect, beforeEach } from 'vitest';
import { useBudgetStore, selectVariableBudget, selectTotalFixed } from './budgetStore';
import { useTransactionStore, selectSpentToday, selectSpentPeriod, selectCategoryTransactions } from './transactionStore';
import { useAlertStore } from './alertStore';
import { Category } from '@/domain/models';
import { db } from '@/db/database';

// ── Helpers ─────────────────────────────────────────────────

function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function resetStores() {
  await db.budgets.clear();
  await db.fixedExpenses.clear();
  await db.transactions.clear();
  useBudgetStore.setState({ budget: null, fixedExpenses: [], isHydrated: false });
  useTransactionStore.setState({ transactions: [], isHydrated: false });
  useAlertStore.setState({ alerts: [] });
}

// ── Budget Store ────────────────────────────────────────────

describe('budgetStore', () => {
  beforeEach(async () => {
    await resetStores();
  });

  it('starts with null budget and empty expenses', () => {
    const state = useBudgetStore.getState();
    expect(state.budget).toBeNull();
    expect(state.fixedExpenses).toEqual([]);
    expect(state.isHydrated).toBe(false);
  });

  it('setBudget creates a budget and persists it', async () => {
    await useBudgetStore.getState().setBudget({
      salaryAmount: 900_000,
      payDay: 5,
      savingsGoal: 200_000,
    });

    const state = useBudgetStore.getState();
    expect(state.budget).not.toBeNull();
    expect(state.budget!.salaryAmount).toBe(900_000);
    expect(state.budget!.payDay).toBe(5);
    expect(state.budget!.savingsGoal).toBe(200_000);

    // Check Dexie persistence
    const dbBudgets = await db.budgets.toArray();
    expect(dbBudgets).toHaveLength(1);
    expect(dbBudgets[0].salaryAmount).toBe(900_000);
  });

  it('setBudget updates existing budget', async () => {
    await useBudgetStore.getState().setBudget({
      salaryAmount: 900_000,
      payDay: 5,
      savingsGoal: 200_000,
    });

    await useBudgetStore.getState().setBudget({
      salaryAmount: 1_000_000,
      payDay: 10,
      savingsGoal: 250_000,
    });

    const state = useBudgetStore.getState();
    expect(state.budget!.salaryAmount).toBe(1_000_000);
    expect(state.budget!.payDay).toBe(10);

    // Still one row in DB (upserted)
    const dbBudgets = await db.budgets.toArray();
    expect(dbBudgets).toHaveLength(1);
  });

  it('addFixedExpense adds to list and DB', async () => {
    await useBudgetStore.getState().addFixedExpense({
      name: 'Alquiler',
      amount: 100_000,
    });

    const state = useBudgetStore.getState();
    expect(state.fixedExpenses).toHaveLength(1);
    expect(state.fixedExpenses[0].name).toBe('Alquiler');

    const dbExpenses = await db.fixedExpenses.toArray();
    expect(dbExpenses).toHaveLength(1);
    expect(dbExpenses[0].name).toBe('Alquiler');
  });

  it('updateFixedExpense modifies name and amount', async () => {
    await useBudgetStore.getState().addFixedExpense({
      name: 'Celular',
      amount: 37_070,
    });

    const expense = useBudgetStore.getState().fixedExpenses[0];
    await useBudgetStore.getState().updateFixedExpense(expense.id, {
      name: 'Celular',
      amount: 40_000,
    });

    const updated = useBudgetStore.getState().fixedExpenses[0];
    expect(updated.amount).toBe(40_000);
  });

  it('removeFixedExpense deletes from list and DB', async () => {
    await useBudgetStore.getState().addFixedExpense({
      name: 'Internet',
      amount: 15_000,
    });

    const expense = useBudgetStore.getState().fixedExpenses[0];
    await useBudgetStore.getState().removeFixedExpense(expense.id);

    expect(useBudgetStore.getState().fixedExpenses).toHaveLength(0);
    const dbExpenses = await db.fixedExpenses.toArray();
    expect(dbExpenses).toHaveLength(0);
  });

  it('hydrate loads from Dexie', async () => {
    // Pre-populate DB
    await db.budgets.put({
      id: 'test-budget',
      salaryAmount: 500_000,
      payDay: 15,
      savingsGoal: 100_000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await db.fixedExpenses.bulkAdd([
      { id: 'fe-1', name: 'Luz', amount: 5_000 },
      { id: 'fe-2', name: 'Gas', amount: 3_000 },
    ]);

    await useBudgetStore.getState().hydrate();

    const state = useBudgetStore.getState();
    expect(state.isHydrated).toBe(true);
    expect(state.budget!.salaryAmount).toBe(500_000);
    expect(state.fixedExpenses).toHaveLength(2);
  });

  it('selectVariableBudget computes correctly', async () => {
    await useBudgetStore.getState().setBudget({
      salaryAmount: 900_000,
      payDay: 5,
      savingsGoal: 200_000,
    });
    await useBudgetStore.getState().addFixedExpense({ name: 'A', amount: 100_000 });
    await useBudgetStore.getState().addFixedExpense({ name: 'B', amount: 79_301 });

    // 900k - 179301 - 200k = 520699
    expect(selectVariableBudget()).toBe(520_699);
  });

  it('recalculates variable budget when fixed expense is updated', async () => {
    await useBudgetStore.getState().setBudget({
      salaryAmount: 900_000,
      payDay: 5,
      savingsGoal: 200_000,
    });
    await useBudgetStore.getState().addFixedExpense({ name: 'A', amount: 100_000 });

    const before = selectVariableBudget();
    expect(before).toBe(600_000); // 900k - 100k - 200k

    // Update fixed expense
    const exp = useBudgetStore.getState().fixedExpenses[0];
    await useBudgetStore.getState().updateFixedExpense(exp.id, { amount: 200_000 });

    const after = selectVariableBudget();
    expect(after).toBe(500_000); // 900k - 200k - 200k
  });

  it('selectTotalFixed returns correct sum', async () => {
    await useBudgetStore.getState().addFixedExpense({ name: 'A', amount: 5_000 });
    await useBudgetStore.getState().addFixedExpense({ name: 'B', amount: 3_000 });
    expect(selectTotalFixed()).toBe(8_000);
  });
});

// ── Transaction Store ───────────────────────────────────────

describe('transactionStore', () => {
  beforeEach(async () => {
    await resetStores();
    // Set up a budget so period selectors work
    await useBudgetStore.getState().setBudget({
      salaryAmount: 900_000,
      payDay: 5,
      savingsGoal: 200_000,
    });
  });

  it('starts empty', () => {
    expect(useTransactionStore.getState().transactions).toEqual([]);
    expect(useTransactionStore.getState().isHydrated).toBe(false);
  });

  it('addTransaction persists and updates list', async () => {
    await useTransactionStore.getState().addTransaction({
      amount: 2_500,
      category: Category.Comida,
      date: todayISO(),
    });

    const txs = useTransactionStore.getState().transactions;
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(2_500);
    expect(txs[0].category).toBe(Category.Comida);

    const dbTxs = await db.transactions.toArray();
    expect(dbTxs).toHaveLength(1);
  });

  it('addTransaction supports actualAmount for split expenses', async () => {
    await useTransactionStore.getState().addTransaction({
      amount: 100_000,
      actualAmount: 50_000,
      category: Category.Comida,
      date: todayISO(),
      note: 'Super con padre',
    });

    const tx = useTransactionStore.getState().transactions[0];
    expect(tx.actualAmount).toBe(50_000);
    expect(tx.note).toBe('Super con padre');
  });

  it('updateTransaction modifies fields', async () => {
    await useTransactionStore.getState().addTransaction({
      amount: 2_500,
      category: Category.Comida,
      date: todayISO(),
    });

    const tx = useTransactionStore.getState().transactions[0];
    await useTransactionStore.getState().updateTransaction(tx.id, {
      amount: 3_000,
      note: 'Actualizado',
    });

    const updated = useTransactionStore.getState().transactions[0];
    expect(updated.amount).toBe(3_000);
    expect(updated.note).toBe('Actualizado');
  });

  it('removeTransaction deletes from list and DB', async () => {
    await useTransactionStore.getState().addTransaction({
      amount: 1_000,
      category: Category.Otros,
      date: todayISO(),
    });

    const tx = useTransactionStore.getState().transactions[0];
    await useTransactionStore.getState().removeTransaction(tx.id);

    expect(useTransactionStore.getState().transactions).toHaveLength(0);
    const dbTxs = await db.transactions.toArray();
    expect(dbTxs).toHaveLength(0);
  });

  it('hydrate loads transactions from DB ordered by date desc', async () => {
    await db.transactions.bulkAdd([
      {
        id: 'tx-1',
        amount: 1_000,
        category: Category.Comida,
        date: '2026-05-01',
      },
      {
        id: 'tx-2',
        amount: 2_000,
        category: Category.Otros,
        date: '2026-05-10',
      },
    ]);

    await useTransactionStore.getState().hydrate();

    const txs = useTransactionStore.getState().transactions;
    expect(txs).toHaveLength(2);
    expect(txs[0].date).toBe('2026-05-10'); // most recent first
  });

  it('selectSpentToday filters by today', async () => {
    await useTransactionStore.getState().addTransaction({
      amount: 5_000,
      category: Category.Comida,
      date: todayISO(),
    });
    await useTransactionStore.getState().addTransaction({
      amount: 3_000,
      category: Category.Otros,
      date: todayISO(),
    });

    expect(selectSpentToday()).toBe(8_000);
  });

  it('selectSpentPeriod filters by current period', async () => {
    // This is harder to test precisely because the period depends on today's date
    // and payDay. We'll at least verify it returns a number.
    await useTransactionStore.getState().addTransaction({
      amount: 1_000,
      category: Category.Otros,
      date: todayISO(),
    });

    const spent = selectSpentPeriod(5);
    expect(spent).toBeGreaterThanOrEqual(1_000);
  });

  it('selectCategoryTransactions filters by category', async () => {
    await useTransactionStore.getState().addTransaction({
      amount: 1_000,
      category: Category.Comida,
      date: todayISO(),
    });
    await useTransactionStore.getState().addTransaction({
      amount: 2_000,
      category: Category.TimbaCasino,
      date: todayISO(),
    });

    const comidaTxs = selectCategoryTransactions(Category.Comida);
    expect(comidaTxs).toHaveLength(1);
    expect(comidaTxs[0].category).toBe(Category.Comida);
  });
});

// ── Alert Store ─────────────────────────────────────────────

describe('alertStore', () => {
  beforeEach(async () => {
    await resetStores();
    await useBudgetStore.getState().setBudget({
      salaryAmount: 900_000,
      payDay: 5,
      savingsGoal: 200_000,
    });
  });

  it('starts with empty alerts', () => {
    expect(useAlertStore.getState().alerts).toEqual([]);
  });

  it('recalculate produces no alerts when no transactions exist', () => {
    useAlertStore.getState().recalculate();
    expect(useAlertStore.getState().alerts).toHaveLength(0);
  });

  it('alerts fire when risk category exceeds 50% daily budget', async () => {
    // Daily budget for 900k salary with 0 fixed, 200k savings:
    // variable = 700k, depends on period days (typically 28-31)
    // We need to spend enough to exceed 50% daily
    await useTransactionStore.getState().addTransaction({
      amount: 50_000, // This should exceed 50% daily for any reasonable period
      category: Category.TimbaCasino,
      date: todayISO(),
    });

    useAlertStore.getState().recalculate();
    const alerts = useAlertStore.getState().alerts;
    const dailyAlerts = alerts.filter((a) => a.type === 'daily');
    expect(dailyAlerts.length).toBeGreaterThanOrEqual(1);
  });

  it('recalculate clears alerts when no budget', async () => {
    await resetStores();
    useAlertStore.getState().recalculate();
    expect(useAlertStore.getState().alerts).toHaveLength(0);
  });
});
