import { useBudgetStore, selectVariableBudget, selectTotalFixed } from '@/store/budgetStore';
import { useTransactionStore, selectSpentPeriod, selectSpentCategoryPeriod } from '@/store/transactionStore';
import { useAlertStore } from '@/store/alertStore';
import { periodSpendingRatio, getPreviousPeriod, spentInPeriod, getCurrentPeriod, parseDate } from '@/domain/calculator';
import { ALL_CATEGORIES, CATEGORY_LABELS, Category } from '@/domain/models';
import { Card } from '@/ui/components/Card';
import { ProgressBar } from '@/ui/components/ProgressBar';
import { TransactionRow } from '@/ui/components/TransactionRow';
import { BarChart, TopSpends } from '@/ui/components/Charts';
import { Icon } from '@/ui/components/Icon';
import type { NavTab } from '@/ui/components/BottomNav';
import styles from './DashboardTab.module.css';

function categoryIcon(cat: Category): string {
  return CATEGORY_EMOJIS[cat];
}

function format(n: number): string {
  return `$${n.toLocaleString('es-AR')}`;
}

const CATEGORY_EMOJIS: Record<Category, string> = {
  [Category.Comida]: '🍴',
  [Category.TransporteExtra]: '🚗',
  [Category.Entretenimiento]: '🎭',
  [Category.TimbaCasino]: '🎰',
  [Category.Salud]: '💊',
  [Category.Otros]: '📦',
  [Category.Imprevistos]: '⚡',
  [Category.RopaCalzado]: '👕',
};

const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  [Category.Comida]: 'Supermercado y delivery',
  [Category.TransporteExtra]: 'Combustible y peajes',
  [Category.Entretenimiento]: 'Cine y salidas',
  [Category.TimbaCasino]: 'Juegos y apuestas',
  [Category.Salud]: 'Medicina y farmacia',
  [Category.Otros]: 'Gastos varios',
  [Category.Imprevistos]: 'Emergencias',
  [Category.RopaCalzado]: 'Indumentaria',
};

interface DashboardTabProps {
  onNavigate?: (tab: NavTab) => void;
}

export function DashboardTab({ onNavigate }: DashboardTabProps) {
  const budget = useBudgetStore((s) => s.budget);
  const fixedExpenses = useBudgetStore((s) => s.fixedExpenses);
  const alerts = useAlertStore((s) => s.alerts);

  if (!budget) {
    return (
      <div className={styles.empty}>
        <Card className={styles.emptyCard}>
          <div className={styles.emptyIconWrap}>
            <Icon name="warning" size={36} />
          </div>
          <h2 className={styles.emptyTitle}>Configurá tu presupuesto</h2>
          <p className={styles.emptyText}>
            Agregá tu sueldo, día de cobro y meta de ahorro para desbloquear el dashboard.
          </p>
          {onNavigate && (
            <button
              className={styles.emptyCta}
              onClick={() => onNavigate('config')}
            >
              Ir a configuración
              <Icon name="arrow-right" size={16} />
            </button>
          )}
        </Card>
      </div>
    );
  }

  const transactions = useTransactionStore((s) => s.transactions);
  const variable = selectVariableBudget() ?? 0;
  const spentPeriod = selectSpentPeriod(budget.payDay);
  const remainingPeriod = Math.max(0, variable - spentPeriod);
  const fixedTotal = selectTotalFixed();
  const progressRatio = periodSpendingRatio(variable, spentPeriod);

  // Calculate month-over-month comparison
  const today = new Date();
  const prevPeriod = getPreviousPeriod(today, budget.payDay);
  const prevSpent = spentInPeriod(transactions, prevPeriod);
  const comparisonText = (() => {
    if (prevSpent === 0) return '+0% vs mes anterior';
    const diff = spentPeriod - prevSpent;
    const pct = Math.round((diff / prevSpent) * 100);
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${pct}% vs mes anterior`;
  })();

  const categoriesWithSpent = ALL_CATEGORIES
    .map((cat) => ({
      category: cat,
      spent: selectSpentCategoryPeriod(cat, budget.payDay),
    }))
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  // Data for bar chart (top 5 categories)
  const maxCategorySpent = categoriesWithSpent.length > 0 ? categoriesWithSpent[0].spent : 0;
  const chartData = categoriesWithSpent.slice(0, 5).map((c) => ({
    label: CATEGORY_LABELS[c.category],
    value: c.spent,
    max: maxCategorySpent,
  }));

  // Top 3 individual transactions for the period
  const period = getCurrentPeriod(new Date(), budget.payDay);
  const topTransactions = transactions
    .filter((t) => {
      const d = parseDate(t.date);
      return d >= period.start && d <= period.end;
    })
    .sort((a, b) => (b.actualAmount ?? b.amount) - (a.actualAmount ?? a.amount))
    .slice(0, 3)
    .map((t, i) => ({
      rank: i + 1,
      name: t.note || CATEGORY_LABELS[t.category],
      category: CATEGORY_LABELS[t.category],
      amount: format(t.actualAmount ?? t.amount),
    }));

  return (
    <div className={styles.dashboard}>
      {/* Balance card */}
      <section className={styles.sectionTop}>
        <Card variant="balance">
          <span className={styles.cardLabel}>BALANCE DISPONIBLE DEL MES</span>
          <h2 className={styles.balanceAmount}>{format(remainingPeriod)}</h2>
          <div className={styles.trendLine}>
            {prevSpent > 0 && (
              <span className={styles.trendIcon}>
                {spentPeriod > prevSpent ? '\u2191' : spentPeriod < prevSpent ? '\u2193' : '\u2022'}
              </span>
            )}
            <span className={styles.trendText}>{comparisonText}</span>
          </div>
        </Card>
      </section>

      {/* Grid 2 columns */}
      <section className={styles.sectionTop}>
        <div className={styles.grid}>
          <Card className={styles.gridCard}>
            <span className={styles.gridLabel}>Sueldo mensual</span>
            <span className={styles.gridValue}>{format(budget.salaryAmount)}</span>
          </Card>
          <Card className={styles.gridCard}>
            <span className={styles.gridLabel}>Gastado este mes</span>
            <span className={styles.gridValue}>{format(spentPeriod)}</span>
          </Card>
          <Card className={styles.gridCard}>
            <span className={styles.gridLabel}>Restante disponible</span>
            <span className={styles.gridValue}>{format(remainingPeriod)}</span>
          </Card>
          <Card className={styles.gridCard}>
            <span className={styles.gridLabel}>Meta de ahorro</span>
            <span className={styles.gridValue}>{format(budget.savingsGoal)}</span>
          </Card>
        </div>
      </section>

      {/* Budget progress */}
      <section className={styles.section}>
        <ProgressBar
          label="Presupuesto mensual"
          value={progressRatio}
        />
      </section>

      {/* Chart: Gastos por categoría */}
      {chartData.length > 0 && (
        <section className={styles.section}>
          <BarChart title="Gastos por categoría" data={chartData} />
        </section>
      )}

      {/* Top 3 gastos */}
      {topTransactions.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Top gastos</h3>
          </div>
          <TopSpends items={topTransactions} />
        </section>
      )}

      {/* Gastos Variables */}
      {categoriesWithSpent.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Gastos Variables</h3>
            {onNavigate && (
              <button
                className={styles.seeAll}
                onClick={() => onNavigate('expenses')}
              >
                VER TODOS
              </button>
            )}
          </div>
          {categoriesWithSpent.map(({ category, spent }) => (
            <TransactionRow
              key={category}
              icon={categoryIcon(category)}
              name={CATEGORY_LABELS[category]}
              description={CATEGORY_DESCRIPTIONS[category]}
              amount={format(spent)}
            />
          ))}
        </section>
      )}

      {/* Gastos Fijos */}
      {fixedExpenses.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Gastos Fijos</h3>
          <Card>
            {fixedExpenses.map((exp, i) => (
              <div
                key={exp.id}
                className={`${styles.fixedRow} ${i < fixedExpenses.length - 1 ? styles.fixedRowBorder : ''}`}
              >
                <span className={styles.fixedName}>{exp.name}</span>
                <span className={styles.fixedAmount}>{format(exp.amount)}</span>
              </div>
            ))}
            <div className={styles.fixedTotal}>
              <span className={styles.fixedTotalLabel}>Total gastos fijos</span>
              <strong className={styles.fixedTotalValue}>{format(fixedTotal)}</strong>
            </div>
          </Card>
        </section>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <section className={styles.section}>
          <div className={styles.alerts}>
            {alerts.map((a) => (
              <div key={a.id} className={styles.alert}>
                {a.message}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
