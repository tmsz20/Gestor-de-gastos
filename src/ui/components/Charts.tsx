import styles from './Charts.module.css';

interface BarChartData {
  label: string;
  value: number;
  max: number;
}

interface BarChartProps {
  title: string;
  data: BarChartData[];
  format?: (n: number) => string;
}

export function BarChart({ title, data, format = (n) => `$${n.toLocaleString('es-AR')}` }: BarChartProps) {
  if (data.length === 0) return null;

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>{title}</h3>
      {data.map((item, i) => {
        const pct = item.max > 0 ? Math.min(100, (item.value / item.max) * 100) : 0;
        return (
          <div key={i} className={styles.barItem}>
            <span className={styles.barLabel}>{item.label}</span>
            <div className={styles.barTrack}>
              <div className={styles.barFill} style={{ width: `${pct}%` }} />
            </div>
            <span className={styles.barValue}>{format(item.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

interface TopSpendItem {
  rank: number;
  name: string;
  category: string;
  amount: string;
}

interface TopSpendsProps {
  items: TopSpendItem[];
}

export function TopSpends({ items }: TopSpendsProps) {
  if (items.length === 0) return null;

  return (
    <div>
      {items.map((item) => (
        <div key={item.rank} className={styles.topSpendItem}>
          <div className={styles.topSpendRank}>{item.rank}</div>
          <div className={styles.topSpendInfo}>
            <div className={styles.topSpendName}>{item.name}</div>
            <div className={styles.topSpendCategory}>{item.category}</div>
          </div>
          <div className={styles.topSpendAmount}>{item.amount}</div>
        </div>
      ))}
    </div>
  );
}