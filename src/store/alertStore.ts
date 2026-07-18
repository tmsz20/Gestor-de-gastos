import { create } from 'zustand';
import type { Alert } from '@/domain/models';
import { evaluateAlerts, type AlertContext, getCurrentPeriod, todayDate } from '@/domain/calculator';
import { useTransactionStore } from './transactionStore';
import { useBudgetStore } from './budgetStore';

interface AlertState {
  alerts: Alert[];

  /** Recalcula alertas a partir del estado actual de transacciones y presupuesto */
  recalculate: () => void;

  /** Descarta una alerta específica por ID */
  dismissAlert: (id: string) => void;
}

export const useAlertStore = create<AlertState>()((set) => ({
  alerts: [],

  recalculate: () => {
    const budget = useBudgetStore.getState().budget;
    if (!budget) {
      set({ alerts: [] });
      return;
    }

    const period = getCurrentPeriod(todayDate(), budget.payDay);
    const fixed = useBudgetStore.getState().fixedExpenses.reduce(
      (sum, e) => sum + e.amount,
      0,
    );

    // Recalcular usando funciones puras de domain/calculator
    const variable =
      budget.salaryAmount - fixed - budget.savingsGoal;
    const daily =
      period.days > 0 ? Math.floor(variable / period.days) : 0;

    const ctx: AlertContext = {
      transactions: useTransactionStore.getState().transactions,
      period,
      daily,
      variable,
    };

    const newAlerts = evaluateAlerts(ctx);
    set({ alerts: newAlerts });
  },

  dismissAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    }));
  },
}));


