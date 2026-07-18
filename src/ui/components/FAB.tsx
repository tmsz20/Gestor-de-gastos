import { Icon } from './Icon';
import styles from './FAB.module.css';

interface FABProps {
  onClick: () => void;
  label?: string;
}

export function FAB({ onClick, label = 'NUEVO GASTO' }: FABProps) {
  return (
    <div className={styles.wrapper}>
      <button className={label ? styles.extended : styles.circular} onClick={onClick}>
        <Icon name="plus" size={20} />
        {label && <span className={styles.label}>{label}</span>}
      </button>
    </div>
  );
}
