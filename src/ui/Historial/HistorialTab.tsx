import { useState, useMemo, useRef, useCallback } from 'react';
import { useTransactionStore, selectSpentPeriod } from '@/store/transactionStore';
import { useBudgetStore } from '@/store/budgetStore';
import { Category, ALL_CATEGORIES, CATEGORY_LABELS } from '@/domain/models';
import { toISODate, getPreviousPeriod, spentInPeriod } from '@/domain/calculator';
import { Icon } from '@/ui/components/Icon';
import type { IconName } from '@/ui/components/Icon';
import type { NavTab } from '@/ui/components/BottomNav';
import styles from './HistorialTab.module.css';

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
  items: ReturnType<typeof useTransactionStore.getState>['transactions'];
}

function groupByDate(transactions: DateGroup['items']): DateGroup[] {
  const today = todayISO();
  const yesterday = yesterdayISO();
  const groups: DateGroup[] = [];
  const todayTxs = transactions.filter((t) => t.date === today);
  const yesterdayTxs = transactions.filter((t) => t.date === yesterday);
  const olderTxs = transactions.filter((t) => t.date !== today && t.date !== yesterday);
  if (todayTxs.length) groups.push({ label: 'HOY', items: todayTxs });
  if (yesterdayTxs.length) groups.push({ label: 'AYER', items: yesterdayTxs });
  if (olderTxs.length) groups.push({ label: 'FECHAS ANTERIORES', items: olderTxs });
  return groups;
}

interface HistorialTabProps {
  onNavigate?: (tab: NavTab) => void;
}

export function HistorialTab({ onNavigate }: HistorialTabProps) {
  const transactions = useTransactionStore((s) => s.transactions);
  const budget = useBudgetStore((s) => s.budget);
  const removeTransaction = useTransactionStore((s) => s.removeTransaction);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const format = (n: number) => `$${n.toLocaleString('es-AR')}`;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container) return;
    // Only allow pull if at top of scroll
    if (container.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0 && diff < 100) {
      setPullDistance(diff);
    }
  }, [pulling]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 60) {
      // Trigger refresh (reload transactions)
      window.location.reload();
    }
    setPulling(false);
    setPullDistance(0);
  }, [pullDistance]);

  const filtered = useMemo(() => {
    let result = transactions;
    if (filterCategory !== 'all') {
      result = result.filter((t) => t.category === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => {
        const note = (t.note || '').toLowerCase();
        const cat = CATEGORY_LABELS[t.category].toLowerCase();
        return note.includes(q) || cat.includes(q);
      });
    }
    return result;
  }, [transactions, filterCategory, searchQuery]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);
  const spentPeriod = budget ? selectSpentPeriod(budget.payDay) : 0;

  // Calculate comparison with previous month
  const comparison = useMemo(() => {
    if (!budget) return { text: '+0% vs mes anterior', isPositive: true };
    const today = new Date();
    const prevPeriod = getPreviousPeriod(today, budget.payDay);
    const prevSpent = spentInPeriod(transactions, prevPeriod);
    if (prevSpent === 0) return { text: '+0% vs mes anterior', isPositive: true };
    const diff = spentPeriod - prevSpent;
    const pct = Math.round((diff / prevSpent) * 100);
    const sign = diff >= 0 ? '+' : '';
    return {
      text: `${sign}${pct}% vs mes anterior`,
      isPositive: diff >= 0,
    };
  }, [transactions, budget, spentPeriod]);

  return (
    <div
      className={styles.historial}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      <div
        className={`${styles.pullIndicator} ${pullDistance > 0 ? styles.pullIndicatorVisible : styles.pullIndicatorHidden}`}
        style={{ height: pullDistance, padding: pullDistance > 0 ? '12px' : '0' }}
      >
        <span style={{ transform: `rotate(${pullDistance * 2}deg)`, display: 'inline-block' }}>↓</span>
        {pullDistance > 60 ? 'Soltar para actualizar' : 'Deslizar para actualizar'}
      </div>

      <h1 className={styles.title}>HISTORIAL</h1>

      {/* Summary card */}
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>GASTO TOTAL DEL MES</span>
        <span className={styles.summaryAmount}>{format(spentPeriod)}</span>
        <span className={styles.summaryComparison}>{comparison.text}</span>
      </div>

      {/* Search */}
      <div className={styles.searchWrap}>
        <div className={styles.searchIcon}>
          <Icon name="history" size={18} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar gasto..."
          className={styles.searchInput}
        />
      </div>

      {/* Category filter */}
      <div className={styles.filters}>
        <button
          className={`${styles.chip} ${filterCategory === 'all' ? styles.activeChip : ''}`}
          onClick={() => setFilterCategory('all')}
        >
          Todas
        </button>
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`${styles.chip} ${filterCategory === cat ? styles.activeChip : ''}`}
            onClick={() => setFilterCategory(cat)}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Transaction list */}
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
                {group.items.map((t) => (
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
                      className={styles.deleteBtn}
                      onClick={() => removeTransaction(t.id)}
                      aria-label="Eliminar transacción"
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

      {/* FAB */}
      <button
        className={styles.fab}
        aria-label="Agregar gasto"
        onClick={() => onNavigate?.('expenses')}
      >
        <Icon name="plus" size={24} />
      </button>
    </div>
  );
}
