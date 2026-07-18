// ── Categorías ──────────────────────────────────────────────
export enum Category {
  Comida = 'Comida',
  TransporteExtra = 'Transporte extra',
  Entretenimiento = 'Entretenimiento',
  TimbaCasino = 'Timba/Casino',
  Salud = 'Salud',
  Otros = 'Otros',
  Imprevistos = 'Imprevistos',
  RopaCalzado = 'Ropa / Calzado',
}

export const ALL_CATEGORIES: Category[] = Object.values(Category);

/** Categorías que disparan alerta al exceder 50% del presupuesto diario */
export const RISK_CATEGORIES: Category[] = [
  Category.TimbaCasino,
  Category.Entretenimiento,
];

/** Umbral sugerido para Ropa / Calzado (por período) */
export const ROPA_CALZADO_LIMIT = 50_000;

/** Descriptores amigables para cada categoría */
export const CATEGORY_LABELS: Record<Category, string> = {
  [Category.Comida]: 'Comida',
  [Category.TransporteExtra]: 'Transporte extra',
  [Category.Entretenimiento]: 'Entretenimiento',
  [Category.TimbaCasino]: 'Timba/Casino',
  [Category.Salud]: 'Salud',
  [Category.Otros]: 'Otros',
  [Category.Imprevistos]: 'Imprevistos',
  [Category.RopaCalzado]: 'Ropa / Calzado',
};

// ── Tipos de dominio ────────────────────────────────────────

export interface Budget {
  id: string;
  salaryAmount: number;
  payDay: number; // 1-31, día del mes en que cobra
  savingsGoal: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
}

export interface Transaction {
  id: string;
  amount: number; // monto total del gasto
  category: Category;
  date: string; // ISO date (YYYY-MM-DD)
  note?: string;
  /** Para split expenses: cuánto le corresponde al usuario realmente.
   *  Si no se setea, el monto completo cuenta. */
  actualAmount?: number;
}

export interface Alert {
  id: string;
  type: 'daily' | 'period' | 'ropa_calzado' | 'imprevistos';
  category: Category;
  message: string;
  triggeredAt: string; // ISO
}

export interface Period {
  start: Date;
  end: Date;
  days: number;
}
