import { useState } from 'react';
import { useTransactionStore, selectPeriodTransactions, selectCategoryTransactions, selectSpentPeriod } from '@/store/transactionStore';
import { useBudgetStore } from '@/store/budgetStore';
import { Category, ALL_CATEGORIES, CATEGORY_LABELS } from '@/domain/models';
import { toISODate } from '@/domain/calculator';
import { Icon } from '@/ui/components/Icon';
import type { IconName } from '@/ui/components/Icon';
import styles from './TransactionList.module.css';

function categoryIconName(cat: Category): IconName {
  switch (cat) {
    case Category.Comida: return 'food';
    case Category.TransporteExtra: return 'car';
    case Category.Entretenimiento: return 'entertainment';
    case Category.TimbaCasino: return 'entertainment';
    case Category.Salud: return 'health';
    case Category.RopaCalzado: return 'shopping';
    case Category.Otros: return 'shopping';
    case Category.Imprevistos: return 'warning';
    default: return 'shopping';
  }
}

function todayISO(): string {
  return toISODate(new Date());
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toISODate(d);
}

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

  const format = (n: number) => `$${n.toLocaleString('es-AR')}`;
  const today = todayISO();
  const yesterday = yesterdayISO();

  const groups: DateGroup[] = [];
  const todayTxs = filtered.filter((t) => t.date === today);
  const yesterdayTxs = filtered.filter((t) => t.date === yesterday);
  const olderTxs = filtered.filter((t) => t.date !== today && t.date !== yesterday);

  if (todayTxs.length > 0) groups.push({ label: 'HOY', transactions: todayTxs });
  if (yesterdayTxs.length > 0) groups.push({ label: 'AYER', transactions: yesterdayTxs });
  if (olderTxs.length > 0) groups.push({ label: 'FECHAS ANTERIORES', transactions: olderTxs });

  return (
    <div className={styles.list}>
      {/* Summary card */}
      {budget && (
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>GASTO TOTAL DEL MES</span>
          <span className={styles.summaryAmount}>{format(spentPeriod)}</span>
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
                      <span className={styles.itemAmount}>-{format(t.actualAmount ?? t.amount)}</span>
                      <span className={styles.itemDate}>{t.date}</span>
                    </div>
                    <button
                      className={styles.delete}
                      onClick={() => removeTransaction(t.id)}
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
