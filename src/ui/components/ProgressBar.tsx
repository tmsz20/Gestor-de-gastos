import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  value: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'action' | 'savings';
}

export function ProgressBar({ value, label, showPercentage = true, variant = 'action' }: ProgressBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);

  return (
    <div className={styles.wrapper}>
      {(label || showPercentage) && (
        <div className={styles.header}>
          {label && <span className={styles.label}>{label}</span>}
          {showPercentage && <span className={styles.percentage}>{pct}% utilizado</span>}
        </div>
      )}
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${variant === 'savings' ? styles.savings : styles.action}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
