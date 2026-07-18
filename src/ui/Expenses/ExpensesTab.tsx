import { useState } from 'react';
import { useTransactionStore } from '@/store/transactionStore';
import { useAlertStore } from '@/store/alertStore';
import { Category, ALL_CATEGORIES, CATEGORY_LABELS } from '@/domain/models';
import { toISODate } from '@/domain/calculator';
import { TransactionList } from './TransactionList';
import styles from './ExpensesTab.module.css';

function todayISO(): string {
  return toISODate(new Date());
}

export function ExpensesTab() {
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>(Category.Otros);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [actualAmount, setActualAmount] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) return;

    await addTransaction({
      amount: parsedAmount,
      category,
      date,
      note: note || undefined,
      actualAmount: actualAmount ? Number(actualAmount) : undefined,
    });

    useAlertStore.getState().recalculate();

    setAmount('');
    setNote('');
    setActualAmount('');
    setCategory(Category.Otros);
    setDate(todayISO());
  };

  return (
    <div className={styles.expenses}>
      <h1 className={styles.title}>Registrar Gasto</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span>Monto total</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="$0"
            min="1"
            required
            inputMode="decimal"
          />
        </label>

        <label className={styles.field}>
          <span>Te corresponde (opcional)</span>
          <input
            type="number"
            value={actualAmount}
            onChange={(e) => setActualAmount(e.target.value)}
            placeholder="Split expense — lo que pagás vos"
            min="0"
            inputMode="decimal"
          />
        </label>

        <label className={styles.field}>
          <span>Categoría</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Fecha</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>

        <label className={styles.field}>
          <span>Nota (opcional)</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: almuerzo con amigos"
          />
        </label>

        <button type="submit" className={styles.submit}>
          Registrar gasto
        </button>
      </form>

      <TransactionList />
    </div>
  );
}
