import { useState } from 'react';
import { useTransactionStore, selectPeriodTransactions, selectCategoryTransactions, selectSpentPeriod } from '@/store/transactionStore';
import { useBudgetStore } from '@/store/budgetStore';
import { useAlertStore } from '@/store/alertStore';
import { Category, ALL_CATEGORIES, CATEGORY_LABELS } from '@/domain/models';
import { todayISO, yesterdayISO } from '@/domain/calculator';
import { Icon } from '@/ui/components/Icon';
import { categoryIconName, formatCurrency } from '@/ui/helpers';
import styles from './TransactionList.module.css';

interface DateGroup {
  label: string;
  transactions: typeof sampleTransaction[];
}

const sampleTransaction: { id: string; amount: number; actualAmount?: number; category: Category; date: string; note?: string } = {
  id: '', amount: 0, category: Category.Otros, date: '',
};

export function TransactionList() {
  const budget = useBudgetStore((s) => s.budget);
  const transactions = useTransactionStore((s) => s.transactions);
  const removeTransaction = useTransactionStore((s) => s.removeTransaction);
  const [filterCategory, setFilterCategory] = useState<Category | null>(null);

  const filtered = filterCategory
    ? selectCategoryTransactions(filterCategory)
    : budget
      ? selectPeriodTransactions(budget.payDay)
      : transactions;

  const spentPeriod = budget ? selectSpentPeriod(budget.payDay) : 0;

  const today = todayISO();
  const yesterday = yesterdayISO();

  const groups: DateGroup[] = [];
  const todayTxs = filtered.filter((t) => t.date === today);
  const yesterdayTxs = filtered.filter((t) => t.date === yesterday);
  const olderTxs = filtered.filter((t) => t.date !== today && t.date !== yesterday);

  if (todayTxs.length > 0) groups.push({ label: 'HOY', transactions: todayTxs });
  if (yesterdayTxs.length > 0) groups.push({ label: 'AYER', transactions: yesterdayTxs });
  if (olderTxs.length > 0) groups.push({ label: 'FECHAS ANTERIORES', transactions: olderTxs });

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm('¿Estás seguro de que querés eliminar este gasto?')) {
      await removeTransaction(id);
      useAlertStore.getState().recalculate();
    }
  };

  return (
    <div className={styles.list}>
      {/* Summary card */}
      {budget && (
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>GASTO TOTAL DEL MES</span>
          <span className={styles.summaryAmount}>{formatCurrency(spentPeriod)}</span>
        </div>
      )}

      {/* Chips */}
      <div className={styles.filters}>
        <button
          className={`${styles.chip} ${filterCategory === null ? styles.active : ''}`}
          onClick={() => setFilterCategory(null)}
        >
          Todas
        </button>
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`${styles.chip} ${filterCategory === cat ? styles.active : ''}`}
            onClick={() => setFilterCategory(cat)}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Transactions */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="history" size={32} />
          <p>No hay gastos registrados.</p>
        </div>
      ) : (
        <div className={styles.groups}>
          {groups.map((group) => (
            <section key={group.label} className={styles.group}>
              <h3 className={styles.groupHeader}>{group.label}</h3>
              <div className={styles.items}>
                {group.transactions.map((t) => (
                  <div key={t.id} className={styles.item}>
                    <div className={styles.itemIcon}>
                      <Icon name={categoryIconName(t.category)} size={20} />
                    </div>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>{t.note || CATEGORY_LABELS[t.category]}</span>
                      <span className={styles.itemCategory}>{CATEGORY_LABELS[t.category]}</span>
                    </div>
                    <div className={styles.itemRight}>
                      <span className={styles.itemAmount}>-{formatCurrency(t.actualAmount ?? t.amount)}</span>
                      <span className={styles.itemDate}>{t.date}</span>
                    </div>
                    <button
                      className={styles.delete}
                      onClick={() => handleDeleteTransaction(t.id)}
                      title="Eliminar"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
