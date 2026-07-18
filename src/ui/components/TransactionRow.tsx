import styles from './TransactionRow.module.css';

interface TransactionRowProps {
  icon: string;
  name: string;
  description?: string;
  amount: string;
}

export function TransactionRow({ icon, name, description, amount }: TransactionRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.left}>
        <div className={styles.iconCircle}>{icon}</div>
        <div className={styles.info}>
          <span className={styles.name}>{name}</span>
          {description && <span className={styles.description}>{description}</span>}
        </div>
      </div>
      <span className={styles.amount}>{amount}</span>
    </div>
  );
}
