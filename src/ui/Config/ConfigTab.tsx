import { useState } from 'react';
import { useBudgetStore, selectTotalFixed } from '@/store/budgetStore';
import { useTransactionStore, selectSpentPeriod } from '@/store/transactionStore';
import { useAlertStore } from '@/store/alertStore';
import { Icon } from '@/ui/components/Icon';
import { ProgressBar } from '@/ui/components/ProgressBar';
import { formatCurrency } from '@/ui/helpers';
import styles from './ConfigTab.module.css';

export function ConfigTab() {
  const budget = useBudgetStore((s) => s.budget);
  const fixedExpenses = useBudgetStore((s) => s.fixedExpenses);
  const setBudget = useBudgetStore((s) => s.setBudget);
  const addFixedExpense = useBudgetStore((s) => s.addFixedExpense);
  const updateFixedExpense = useBudgetStore((s) => s.updateFixedExpense);
  const removeFixedExpense = useBudgetStore((s) => s.removeFixedExpense);

  const [salaryAmount, setSalaryAmount] = useState(
    budget?.salaryAmount?.toString() ?? '',
  );
  const [payDay, setPayDay] = useState(budget?.payDay?.toString() ?? '5');
  const [savingsGoal, setSavingsGoal] = useState(
    budget?.savingsGoal?.toString() ?? '',
  );

  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');

  const formatK = (n: number) => {
    if (n >= 1000) return `ARS ${Math.round(n / 1000)}k`;
    return `ARS ${n}`;
  };

  const fixedTotal = useBudgetStore(selectTotalFixed);
  const salaryNum = Number(salaryAmount) || budget?.salaryAmount || 0;
  const savingsNum = Number(savingsGoal) || budget?.savingsGoal || 0;
  const fixedPct = salaryNum > 0 ? Math.round((fixedTotal / salaryNum) * 100) : 0;
  const remaining = Math.max(0, salaryNum - fixedTotal - savingsNum);

  const variable = salaryNum - fixedTotal - savingsNum;
  const spentPeriod = useTransactionStore((s) => selectSpentPeriod(budget?.payDay ?? (Number(payDay) || 5), s)) ?? 0;
  const saved = Math.max(0, variable - spentPeriod);
  const savingsProgressValue = savingsNum > 0 ? Math.min(1, saved / savingsNum) : 0;
  const savingsPct = salaryNum > 0 ? Math.round((savingsNum / salaryNum) * 100) : 0;

  const handleSaveBudget = async () => {
    const salary = Number(salaryAmount);
    const day = Number(payDay);
    const savings = Number(savingsGoal);
    if (!salary || !day || !savings) return;
    await setBudget({ salaryAmount: salary, payDay: day, savingsGoal: savings });
    useAlertStore.getState().recalculate();
  };

  const handleCancel = () => {
    setSalaryAmount(budget?.salaryAmount?.toString() ?? '');
    setPayDay(budget?.payDay?.toString() ?? '5');
    setSavingsGoal(budget?.savingsGoal?.toString() ?? '');
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newExpenseAmount);
    if (!newExpenseName || !amount) return;
    await addFixedExpense({ name: newExpenseName, amount });
    useAlertStore.getState().recalculate();
    setNewExpenseName('');
    setNewExpenseAmount('');
  };

  const handleEdit = async (id: string) => {
    await updateFixedExpense(id, {
      name: editName,
      amount: Number(editAmount),
    });
    useAlertStore.getState().recalculate();
    setEditingId(null);
  };

  const startEdit = (expense: { id: string; name: string; amount: number }) => {
    setEditingId(expense.id);
    setEditName(expense.name);
    setEditAmount(expense.amount.toString());
  };

  return (
    <div className={styles.config}>
      <h1 className={styles.title}>CONFIGURACIÓN</h1>

      {/* Info card */}
      <div className={styles.infoCard}>
        <Icon name="info" size={22} />
        <p>Definí tus parámetros financieros para obtener proyecciones precisas. Tu sueldo y gastos fijos son la base de tu salud financiera.</p>
      </div>

      {/* Presupuesto card */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Sueldo Mensual</h2>
        <div className={styles.prefixField}>
          <span className={styles.prefix}>ARS</span>
          <input
            type="number"
            value={salaryAmount}
            onChange={(e) => setSalaryAmount(e.target.value)}
            placeholder="900000"
            min="0"
            required
            inputMode="decimal"
            className={styles.prefixInput}
          />
        </div>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Día de cobro</span>
          <input
            type="number"
            value={payDay}
            onChange={(e) => setPayDay(e.target.value)}
            min="1"
            max="31"
            required
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Meta de ahorro</span>
          <input
            type="number"
            value={savingsGoal}
            onChange={(e) => setSavingsGoal(e.target.value)}
            placeholder="200000"
            min="0"
            required
            inputMode="decimal"
            className={styles.input}
          />
        </label>
      </div>

      {/* Gastos Fijos */}
      <section className={styles.fixedSection}>
        <div className={styles.fixedHeader}>
          <h2 className={styles.cardTitle}>Gastos Fijos</h2>
          <button
            type="button"
            className={styles.addPill}
            onClick={() => {
              const amount = Number(newExpenseAmount);
              if (newExpenseName && amount) {
                handleAddExpense({ preventDefault: () => {} } as React.FormEvent);
              }
            }}
          >
            <Icon name="plus" size={16} />
            Nuevo Gasto
          </button>
        </div>

        <div className={styles.card}>
          {/* Inline add form */}
          <form onSubmit={handleAddExpense} className={styles.inlineForm}>
            <input
              type="text"
              value={newExpenseName}
              onChange={(e) => setNewExpenseName(e.target.value)}
              placeholder="Categoría (ej: Alquiler)"
              required
              className={styles.inlineInput}
            />
            <input
              type="number"
              value={newExpenseAmount}
              onChange={(e) => setNewExpenseAmount(e.target.value)}
              placeholder="Monto"
              min="0"
              required
              inputMode="decimal"
              className={styles.inlineInput}
            />
            <button type="submit" className={styles.addBtn}>
              <Icon name="plus" size={18} />
            </button>
          </form>

          {/* List */}
          {fixedExpenses.length === 0 ? (
            <div className={styles.emptyList}>
              <span>No hay gastos fijos registrados.</span>
              <span className={styles.emptyHint}>Agregá alquiler, servicios y otros gastos mensuales.</span>
            </div>
          ) : (
            <div className={styles.expenseTable}>
              <div className={styles.tableHeader}>
                <span>Categoría</span>
                <span>Monto (ARS)</span>
              </div>
              {fixedExpenses.map((exp) => (
                <div key={exp.id} className={styles.tableRow}>
                  {editingId === exp.id ? (
                    <div className={styles.editRow}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={styles.editInput}
                      />
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        inputMode="decimal"
                        className={styles.editInput}
                      />
                      <button onClick={() => handleEdit(exp.id)} className={styles.editAction}>
                        <Icon name="plus" size={16} />
                      </button>
                      <button onClick={() => setEditingId(null)} className={styles.editAction}>
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className={styles.expenseName}>{exp.name}</span>
                      <div className={styles.expenseRight}>
                        <span className={styles.expenseAmount}>{formatCurrency(exp.amount)}</span>
                        <div className={styles.rowActions}>
                          <button onClick={() => startEdit(exp)} className={styles.rowBtn}>
                            <Icon name="settings" size={15} />
                          </button>
                          <button onClick={() => { removeFixedExpense(exp.id); useAlertStore.getState().recalculate(); }} className={styles.rowBtn}>
                            <Icon name="close" size={13} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div className={styles.tableTotal}>
                <span>Total gastos fijos</span>
                <strong>{formatCurrency(useBudgetStore(selectTotalFixed))}</strong>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Meta de Ahorro */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Meta de Ahorro</h2>
        <p className={styles.cardSubtitle}>Objetivo: {savingsPct}% del ingreso</p>
        <ProgressBar value={savingsProgressValue} showPercentage={false} />
        <div className={styles.savingsLabels}>
          <span className={styles.savingsLabel}>Actual ARS {formatCurrency(saved)}</span>
          <span className={styles.savingsLabel}>Objetivo ARS {formatCurrency(savingsNum)}</span>
        </div>
      </div>

      {/* Resumen de Distribución */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Resumen de Distribución</h2>
        <div className={styles.distGrid}>
          <div className={styles.distItem}>
            <span className={styles.distValue}>{fixedPct}%</span>
            <span className={styles.distLabel}>Gasto Fijo</span>
          </div>
          <div className={styles.distItem}>
            <span className={styles.distValue}>{formatK(remaining)}</span>
            <span className={styles.distLabel}>Remanente</span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <button className={styles.submitBtn} onClick={handleSaveBudget}>
        Guardar configuración
      </button>
      <button className={styles.cancelBtn} onClick={handleCancel}>
        Cancelar cambios
      </button>
    </div>
  );
}
