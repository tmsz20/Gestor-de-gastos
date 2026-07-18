import { describe, it, expect } from 'vitest';
import {
  getCurrentPeriod,
  dailyBudget,
  variableBudget,
  remainingBudget,
  remainingDailyBudget,
  spentOnDay,
  spentInPeriod,
  spentByCategoryInPeriod,
  savingsProgress,
  periodSpendingRatio,
  evaluateAlerts,
  parseDate,
  toISODate,
  totalFixedExpenses,
} from './calculator';
import { Category } from './models';
import type { FixedExpense, Transaction } from './models';

// ── Helpers ─────────────────────────────────────────────────

function date(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

function makeTx(
  overrides: Partial<Transaction> & { amount: number; category: Category; date: string },
): Transaction {
  return {
    id: crypto.randomUUID(),
    note: undefined,
    actualAmount: undefined,
    ...overrides,
  };
}

// ── getCurrentPeriod ────────────────────────────────────────

describe('getCurrentPeriod', () => {
  it('payDay=5, today=May 10 → start May 5, end Jun 4', () => {
    const today = date(2026, 5, 10);
    const period = getCurrentPeriod(today, 5);

    // start should be May 5
    expect(period.start.getFullYear()).toBe(2026);
    expect(period.start.getMonth()).toBe(4); // 0-indexed: May = 4
    expect(period.start.getDate()).toBe(5);

    // end should be Jun 4
    expect(period.end.getFullYear()).toBe(2026);
    expect(period.end.getMonth()).toBe(5); // 0-indexed: June = 5
    expect(period.end.getDate()).toBe(4);
  });

  it('payDay=5, today=May 3 → start Apr 5, end May 4 (cross-month back)', () => {
    const today = date(2026, 5, 3);
    const period = getCurrentPeriod(today, 5);

    expect(period.start.getFullYear()).toBe(2026);
    expect(period.start.getMonth()).toBe(3); // April = 3
    expect(period.start.getDate()).toBe(5);

    expect(period.end.getFullYear()).toBe(2026);
    expect(period.end.getMonth()).toBe(4); // May = 4
    expect(period.end.getDate()).toBe(4);
  });

  it('payDay=5, today=May 5 exactly → start May 5, end Jun 4', () => {
    const today = date(2026, 5, 5);
    const period = getCurrentPeriod(today, 5);

    expect(period.start.getDate()).toBe(5);
    expect(period.start.getMonth()).toBe(4); // May
  });

  it('payDay=4, today=May 10 → start May 4, end Jun 3', () => {
    const today = date(2026, 5, 10);
    const period = getCurrentPeriod(today, 4);

    expect(period.start.getDate()).toBe(4);
    expect(period.end.getDate()).toBe(3);
  });

  it('payDay=4, today=May 3 → start Apr 4, end May 3', () => {
    const today = date(2026, 5, 3);
    const period = getCurrentPeriod(today, 4);

    expect(period.start.getFullYear()).toBe(2026);
    expect(period.start.getMonth()).toBe(3); // April
    expect(period.start.getDate()).toBe(4);

    expect(period.end.getMonth()).toBe(4); // May
    expect(period.end.getDate()).toBe(3);
  });

  it('month edge: payDay=31, today=Feb 3 → start Jan 31, end Feb 27/28', () => {
    const today = date(2026, 2, 3);
    const period = getCurrentPeriod(today, 31);

    expect(period.start.getDate()).toBe(31);
    expect(period.start.getMonth()).toBe(0); // January
  });

  it('payDay=5, today=Jan 3 → cross year back', () => {
    const today = date(2026, 1, 3);
    const period = getCurrentPeriod(today, 5);

    expect(period.start.getFullYear()).toBe(2025);
    expect(period.start.getMonth()).toBe(11); // December 2025
    expect(period.start.getDate()).toBe(5);
  });

  it('period has correct days count (31 days for May 5 to Jun 4)', () => {
    const today = date(2026, 5, 10); // May 10, payDay=5
    const period = getCurrentPeriod(today, 5);
    // May 5 (inclusive) to Jun 4 (inclusive):
    // May: 5,6,...,31 = 27 days. Jun: 1,2,3,4 = 4 days. Total = 31 days
    expect(period.days).toBe(31);
  });

  it('payDay=5, today=May 4 (day before payDay) → period started last month', () => {
    const today = date(2026, 5, 4);
    const period = getCurrentPeriod(today, 5);

    expect(period.start.getMonth()).toBe(3); // April
    expect(period.start.getDate()).toBe(5);
  });
});

// ── Variable / Daily Budget ─────────────────────────────────

describe('variableBudget', () => {
  it('salary 900k, fixed 179301, savings 200k → 520699', () => {
    expect(variableBudget(900_000, 179_301, 200_000)).toBe(520_699);
  });

  it('zero if all consumed', () => {
    expect(variableBudget(100_000, 100_000, 0)).toBe(0);
  });

  it('negative if over budget', () => {
    expect(variableBudget(100_000, 80_000, 50_000)).toBe(-30_000);
  });
});

describe('dailyBudget', () => {
  it('520699 / 27 = 19285 (floor)', () => {
    expect(dailyBudget(520_699, 27)).toBe(19_285);
  });

  it('0 if periodDays = 0', () => {
    expect(dailyBudget(100_000, 0)).toBe(0);
  });

  it('variable budget zero → daily zero', () => {
    expect(dailyBudget(0, 30)).toBe(0);
  });
});

// ── Total Fixed Expenses ────────────────────────────────────

describe('totalFixedExpenses', () => {
  it('sums all expenses', () => {
    const expenses: FixedExpense[] = [
      { id: '1', name: 'Alquiler', amount: 100_000 },
      { id: '2', name: 'Celular', amount: 37_070 },
    ];
    expect(totalFixedExpenses(expenses)).toBe(137_070);
  });

  it('returns 0 for empty array', () => {
    expect(totalFixedExpenses([])).toBe(0);
  });
});

// ── Remaining Budget ────────────────────────────────────────

describe('remainingBudget', () => {
  it('520699 - 100000 = 420699', () => {
    expect(remainingBudget(520_699, 100_000)).toBe(420_699);
  });

  it('can go negative', () => {
    expect(remainingBudget(50_000, 60_000)).toBe(-10_000);
  });
});

describe('remainingDailyBudget', () => {
  it('daily 19285 - spent 8000 = 11285', () => {
    expect(remainingDailyBudget(19_285, 8_000)).toBe(11_285);
  });
});

// ── Spent Calculations ──────────────────────────────────────

describe('spentOnDay', () => {
  it('sums transactions for a specific date', () => {
    const txs: Transaction[] = [
      makeTx({ amount: 5_000, category: Category.Comida, date: '2026-05-10' }),
      makeTx({ amount: 3_000, category: Category.Otros, date: '2026-05-10' }),
      makeTx({ amount: 10_000, category: Category.Salud, date: '2026-05-11' }),
    ];
    const may10 = date(2026, 5, 10);
    expect(spentOnDay(txs, may10)).toBe(8_000);
  });

  it('respects actualAmount for split expenses', () => {
    const txs: Transaction[] = [
      makeTx({
        amount: 100_000,
        actualAmount: 50_000,
        category: Category.Comida,
        date: '2026-05-10',
      }),
    ];
    expect(spentOnDay(txs, date(2026, 5, 10))).toBe(50_000);
  });

  it('returns 0 if no transactions on that day', () => {
    expect(spentOnDay([], date(2026, 5, 10))).toBe(0);
  });
});

describe('spentInPeriod', () => {
  it('sums all transactions within period', () => {
    const txs: Transaction[] = [
      makeTx({ amount: 5_000, category: Category.Comida, date: '2026-05-05' }),
      makeTx({ amount: 3_000, category: Category.Otros, date: '2026-06-04' }),
      makeTx({ amount: 9_999, category: Category.Salud, date: '2026-06-05' }), // outside
    ];
    const period = getCurrentPeriod(date(2026, 5, 10), 5);
    // May 5 - Jun 4: includes first two, excludes third
    expect(spentInPeriod(txs, period)).toBe(8_000);
  });
});

describe('spentByCategoryInPeriod', () => {
  it('filters by category and period', () => {
    const txs: Transaction[] = [
      makeTx({ amount: 5_000, category: Category.Comida, date: '2026-05-10' }),
      makeTx({ amount: 3_000, category: Category.Otros, date: '2026-05-10' }),
      makeTx({ amount: 2_000, category: Category.Comida, date: '2026-05-03' }), // before period
    ];
    const period = getCurrentPeriod(date(2026, 5, 10), 5);
    // Only comida within May 5 - Jun 4
    expect(spentByCategoryInPeriod(txs, Category.Comida, period)).toBe(5_000);
  });
});

// ── Savings Progress ────────────────────────────────────────

describe('savingsProgress', () => {
  it('variable=520699, spent=200000, goal=200000 → 1.0 (capped)', () => {
    const progress = savingsProgress(520_699, 200_000, 200_000);
    expect(progress).toBeCloseTo(1.0);
  });

  it('nothing saved yet → 1.0 (full variable intact)', () => {
    const progress = savingsProgress(500_000, 0, 200_000);
    expect(progress).toBe(1.0); // saved = 500k > 200k goal → capped at 1
  });

  it('goal zero → progress zero', () => {
    expect(savingsProgress(500_000, 100_000, 0)).toBe(0);
  });

  it('overspent → zero', () => {
    expect(savingsProgress(100_000, 120_000, 50_000)).toBe(0);
  });
});

// ── Period Spending Ratio ────────────────────────────────────

describe('periodSpendingRatio', () => {
  it('spent 260350 of 520699 → ~0.5', () => {
    expect(periodSpendingRatio(520_699, 260_350)).toBeCloseTo(0.5, 1);
  });

  it('capped at 1.0', () => {
    expect(periodSpendingRatio(100_000, 200_000)).toBe(1.0);
  });

  it('variable zero → ratio zero', () => {
    expect(periodSpendingRatio(0, 100)).toBe(0);
  });
});

// ── Alerts ──────────────────────────────────────────────────

describe('evaluateAlerts', () => {
  const baseCtx = {
    period: getCurrentPeriod(date(2026, 5, 10), 5),
    daily: 19_285,
    variable: 520_699,
  };

  it('no transactions → no alerts', () => {
    const alerts = evaluateAlerts({ ...baseCtx, transactions: [] });
    expect(alerts).toHaveLength(0);
  });

  it('Timba/Casino over 50% daily → daily alert', () => {
    const txs: Transaction[] = [
      makeTx({
        amount: 12_000,
        category: Category.TimbaCasino,
        date: '2026-05-10',
      }),
    ];
    const alerts = evaluateAlerts({
      ...baseCtx,
      transactions: txs,
      today: date(2026, 5, 10), // simulate "today" is May 10
    });
    const dailyAlerts = alerts.filter((a) => a.type === 'daily' && a.category === Category.TimbaCasino);
    expect(dailyAlerts.length).toBeGreaterThanOrEqual(1);
    expect(dailyAlerts[0].message).toContain('50%');
  });

  it('Timba/Casino under 50% daily → no daily alert', () => {
    const txs: Transaction[] = [
      makeTx({
        amount: 5_000,
        category: Category.TimbaCasino,
        date: '2026-05-10',
      }),
    ];
    const alerts = evaluateAlerts({
      ...baseCtx,
      transactions: txs,
      today: date(2026, 5, 10),
    });
    const dailyAlerts = alerts.filter((a) => a.type === 'daily');
    expect(dailyAlerts).toHaveLength(0);
  });

  it('Entretenimiento over 20% variable → period alert', () => {
    const txs: Transaction[] = [
      makeTx({
        amount: 110_000, // > 20% of 520,699 = 104,139
        category: Category.Entretenimiento,
        date: '2026-05-10',
      }),
    ];
    const alerts = evaluateAlerts({ ...baseCtx, transactions: txs });
    const periodAlerts = alerts.filter((a) => a.type === 'period');
    expect(periodAlerts.length).toBeGreaterThanOrEqual(1);
    expect(periodAlerts[0].message).toContain('20%');
  });

  it('Ropa / Calzado over 50k → ropa alert', () => {
    const txs: Transaction[] = [
      makeTx({
        amount: 60_000,
        category: Category.RopaCalzado,
        date: '2026-05-10',
      }),
    ];
    const alerts = evaluateAlerts({ ...baseCtx, transactions: txs });
    const ropaAlerts = alerts.filter((a) => a.type === 'ropa_calzado');
    expect(ropaAlerts.length).toBeGreaterThanOrEqual(1);
  });

  it('Ropa / Calzado under 50k → no ropa alert', () => {
    const txs: Transaction[] = [
      makeTx({
        amount: 40_000,
        category: Category.RopaCalzado,
        date: '2026-05-10',
      }),
    ];
    const alerts = evaluateAlerts({ ...baseCtx, transactions: txs });
    const ropaAlerts = alerts.filter((a) => a.type === 'ropa_calzado');
    expect(ropaAlerts).toHaveLength(0);
  });

  it('Imprevistos exceed free margin → alert', () => {
    // variable = 50,000. Spend 49,000 in Comida. Margin = 1,000.
    // Imprevistos 2,000 → exceeds margin → alert
    const ctx = {
      period: getCurrentPeriod(date(2026, 5, 10), 5),
      daily: 1_800,
      variable: 50_000,
      transactions: [
        makeTx({ amount: 49_000, category: Category.Comida, date: '2026-05-10' }),
        makeTx({ amount: 2_000, category: Category.Imprevistos, date: '2026-05-10' }),
      ],
    };
    const alerts = evaluateAlerts(ctx);
    const impAlerts = alerts.filter((a) => a.type === 'imprevistos');
    expect(impAlerts.length).toBeGreaterThanOrEqual(1);
  });

  it('Imprevistos within margin → no alert', () => {
    const ctx = {
      period: getCurrentPeriod(date(2026, 5, 10), 5),
      daily: 1_800,
      variable: 50_000,
      transactions: [
        makeTx({ amount: 10_000, category: Category.Comida, date: '2026-05-10' }),
        makeTx({ amount: 5_000, category: Category.Imprevistos, date: '2026-05-10' }),
      ],
    };
    const alerts = evaluateAlerts(ctx);
    const impAlerts = alerts.filter((a) => a.type === 'imprevistos');
    expect(impAlerts).toHaveLength(0);
  });

  it('split expense with actualAmount is respected in alert calculations', () => {
    const txs: Transaction[] = [
      makeTx({
        amount: 100_000,
        actualAmount: 8_000, // only 8k counts
        category: Category.TimbaCasino,
        date: '2026-05-10',
      }),
    ];
    // 8k < 50% of 19,285 = 9,642.5 → no alert
    const alerts = evaluateAlerts({
      ...baseCtx,
      transactions: txs,
      today: date(2026, 5, 10),
    });
    const dailyAlerts = alerts.filter((a) => a.type === 'daily');
    expect(dailyAlerts).toHaveLength(0);
  });
});

// ── Date helpers ────────────────────────────────────────────

describe('parseDate / toISODate', () => {
  it('roundtrips correctly', () => {
    const iso = '2026-05-10';
    const d = parseDate(iso);
    expect(toISODate(d)).toBe(iso);
  });

  it('parses Jan 1 correctly', () => {
    const d = parseDate('2026-01-01');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });
});
