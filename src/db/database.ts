import Dexie, { type Table } from 'dexie';
import type { Budget, FixedExpense, Transaction } from '@/domain/models';

/**
 * Base de datos offline con Dexie.js (IndexedDB).
 *
 * Tablas:
 * - budgets: configuración de presupuesto (1 sola fila en MVP)
 * - fixedExpenses: gastos fijos mensuales
 * - transactions: gastos variables registrados
 */
class GestorDatabase extends Dexie {
  budgets!: Table<Budget, string>;
  fixedExpenses!: Table<FixedExpense, string>;
  transactions!: Table<Transaction, string>;

  constructor() {
    super('GestorDeGastosDB');

    this.version(1).stores({
      budgets: 'id, createdAt',
      fixedExpenses: 'id',
      transactions: 'id, date, category',
    });
  }
}

/** Instancia singleton de la base de datos */
export const db = new GestorDatabase();
