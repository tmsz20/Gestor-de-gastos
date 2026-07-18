import type { Period, Transaction, Alert, FixedExpense } from './models';
import { Category, RISK_CATEGORIES, ROPA_CALZADO_LIMIT } from './models';

// ── Helpers ─────────────────────────────────────────────────

/** Día actual como Date (sin hora) */
export function todayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Cantidad de días entre dos fechas (inclusive de ambos extremos) */
function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/** Convierte un ISO string (YYYY-MM-DD) a Date local */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Convierte Date a ISO string (YYYY-MM-DD) */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(todayDate());
}

export function yesterdayISO(): string {
  const d = todayDate();
  d.setDate(d.getDate() - 1);
  return toISODate(d);
}

// ── Período ─────────────────────────────────────────────────

/**
 * Calcula el período de cobro actual basado en el día de cobro.
 *
 * Ej: payDay=5, hoy=Mayo 3 → período = Abril 5 a Mayo 4
 * Ej: payDay=5, hoy=Mayo 10 → período = Mayo 5 a Junio 4
 * Ej: payDay=4, hoy=Mayo 3 → período = Abril 4 a Mayo 3
 */
export function getCurrentPeriod(today: Date, payDay: number): Period {
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Si hoy es ANTES del día de cobro, el período empezó el mes pasado
  if (current.getDate() < payDay) {
    current.setMonth(current.getMonth() - 1);
  }

  const start = new Date(current.getFullYear(), current.getMonth(), payDay);

  // Fin = inicio + 1 mes - 1 día
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(end.getDate() - 1);

  const days = daysBetween(start, end);

  return { start, end, days };
}

/**
 * Calcula el período de cobro ANTERIOR basado en el día de cobro.
 * Es el período inmediatamente anterior al período actual.
 */
export function getPreviousPeriod(today: Date, payDay: number): Period {
  const currentPeriod = getCurrentPeriod(today, payDay);
  
  // Inicio del período anterior = inicio del actual - 1 mes
  const prevStart = new Date(currentPeriod.start);
  prevStart.setMonth(prevStart.getMonth() - 1);
  
  // Fin del período anterior = inicio del actual - 1 día
  const prevEnd = new Date(currentPeriod.start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  
  const days = daysBetween(prevStart, prevEnd);
  
  return { start: prevStart, end: prevEnd, days };
}

// ── Presupuesto ─────────────────────────────────────────────

/** Total de gastos fijos */
export function totalFixedExpenses(expenses: FixedExpense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

/** Presupuesto variable: sueldo - fijos - ahorro */
export function variableBudget(
  salaryAmount: number,
  fixedTotal: number,
  savingsGoal: number,
): number {
  return salaryAmount - fixedTotal - savingsGoal;
}

/** Presupuesto diario: variable / días del período */
export function dailyBudget(variable: number, periodDays: number): number {
  if (periodDays <= 0) return 0;
  return Math.floor(variable / periodDays);
}

/** Presupuesto restante en el período */
export function remainingBudget(
  variable: number,
  totalSpentInPeriod: number,
): number {
  return variable - totalSpentInPeriod;
}

/** Presupuesto diario restante HOY */
export function remainingDailyBudget(
  daily: number,
  spentToday: number,
): number {
  return daily - spentToday;
}

/** Gasto total en un día específico */
export function spentOnDay(transactions: Transaction[], date: Date): number {
  const iso = toISODate(date);
  return transactions
    .filter((t) => t.date === iso)
    .reduce((sum, t) => sum + (t.actualAmount ?? t.amount), 0);
}

/** Gasto total en un período */
export function spentInPeriod(
  transactions: Transaction[],
  period: Period,
): number {
  return transactions
    .filter((t) => {
      const d = parseDate(t.date);
      return d >= period.start && d <= period.end;
    })
    .reduce((sum, t) => sum + (t.actualAmount ?? t.amount), 0);
}

/** Gasto por categoría en un período */
export function spentByCategoryInPeriod(
  transactions: Transaction[],
  category: Category,
  period: Period,
): number {
  return transactions
    .filter((t) => {
      if (t.category !== category) return false;
      const d = parseDate(t.date);
      return d >= period.start && d <= period.end;
    })
    .reduce((sum, t) => sum + (t.actualAmount ?? t.amount), 0);
}

/** Porcentaje de ahorro acumulado: lo que sobra del período actual / meta */
export function savingsProgress(
  variable: number,
  totalSpentInPeriod: number,
  savingsGoal: number,
): number {
  if (savingsGoal <= 0) return 0;
  const saved = variable - totalSpentInPeriod;
  return Math.min(1, Math.max(0, saved / savingsGoal));
}

/** Porcentaje del presupuesto variable ya gastado en el período */
export function periodSpendingRatio(
  variable: number,
  spent: number,
): number {
  if (variable <= 0) return 0;
  return Math.min(1, spent / variable);
}

// ── Alertas ─────────────────────────────────────────────────

export interface AlertContext {
  transactions: Transaction[];
  period: Period;
  daily: number;
  variable: number;
  /** Permite inyectar "hoy" para testing. Si no se provee, usa la fecha real. */
  today?: Date;
}

/**
 * Evalúa todas las reglas de alerta y devuelve las alertas disparadas.
 * Se llama cada vez que hay un cambio en transacciones o presupuesto.
 */
export function evaluateAlerts(ctx: AlertContext): Alert[] {
  const alerts: Alert[] = [];
  const today = ctx.today ?? todayDate();
  const todayISO = toISODate(today);

  // ── 1. Alerta diaria: categorías de riesgo > 50% del daily budget
  for (const cat of RISK_CATEGORIES) {
    const spentTodayCat = ctx.transactions
      .filter((t) => t.date === todayISO && t.category === cat)
      .reduce((sum, t) => sum + (t.actualAmount ?? t.amount), 0);

    if (ctx.daily > 0 && spentTodayCat > ctx.daily * 0.5) {
      alerts.push({
        id: `alert-daily-${cat}-${todayISO}`,
        type: 'daily',
        category: cat,
        message: `¡Alerta! Superaste el 50% del presupuesto diario en ${cat}`,
        triggeredAt: new Date().toISOString(),
      });
    }
  }

  // ── 2. Alerta por período: categorías de riesgo > 20% del variable budget
  for (const cat of RISK_CATEGORIES) {
    const spentPeriodCat = spentByCategoryInPeriod(ctx.transactions, cat, ctx.period);
    if (ctx.variable > 0 && spentPeriodCat > ctx.variable * 0.2) {
      alerts.push({
        id: `alert-period-${cat}-${toISODate(ctx.period.start)}`,
        type: 'period',
        category: cat,
        message: `¡Alerta! Superaste el 20% del presupuesto variable mensual en ${cat}`,
        triggeredAt: new Date().toISOString(),
      });
    }
  }

  // ── 3. Alerta Ropa / Calzado: supera $50.000 en el período
  const spentRopa = spentByCategoryInPeriod(ctx.transactions, Category.RopaCalzado, ctx.period);
  if (spentRopa > ROPA_CALZADO_LIMIT) {
    alerts.push({
      id: `alert-ropa-${toISODate(ctx.period.start)}`,
      type: 'ropa_calzado',
      category: Category.RopaCalzado,
      message: `Gastaste más de $${ROPA_CALZADO_LIMIT.toLocaleString('es-AR')} en Ropa / Calzado este período`,
      triggeredAt: new Date().toISOString(),
    });
  }

  // ── 4. Alerta Imprevistos: si el total de imprevistos supera el margen libre
  //    (margen libre = variableBudget - totalSpent no-imprevistos)
  const spentImprevistos = spentByCategoryInPeriod(ctx.transactions, Category.Imprevistos, ctx.period);
  const spentOther = ctx.transactions
    .filter((t) => {
      if (t.category === Category.Imprevistos) return false;
      const d = parseDate(t.date);
      return d >= ctx.period.start && d <= ctx.period.end;
    })
    .reduce((sum, t) => sum + (t.actualAmount ?? t.amount), 0);

  const freeMargin = ctx.variable - spentOther;
  if (freeMargin > 0 && spentImprevistos > freeMargin) {
    alerts.push({
      id: `alert-imprevistos-${toISODate(ctx.period.start)}`,
      type: 'imprevistos',
      category: Category.Imprevistos,
      message: 'Los gastos imprevistos superan el margen disponible. Revisá tu presupuesto.',
      triggeredAt: new Date().toISOString(),
    });
  }

  return alerts;
}
