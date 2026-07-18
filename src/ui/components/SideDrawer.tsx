import { useEffect, useRef } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import type { NavTab } from './BottomNav';
import { useTransactionStore } from '@/store/transactionStore';
import { useBudgetStore } from '@/store/budgetStore';
import styles from './SideDrawer.module.css';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
}

interface MenuItem {
  key: NavTab | 'export' | 'about';
  label: string;
  icon: IconName;
  disabled?: boolean;
  badge?: string;
}

const ITEMS: MenuItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'historial', label: 'Historial', icon: 'history' },
  { key: 'config', label: 'Configuración', icon: 'settings' },
  { key: 'export', label: 'Exportar datos', icon: 'arrow-right' },
  { key: 'about', label: 'Acerca de la app', icon: 'arrow-right', disabled: true },
];

export function SideDrawer({ isOpen, onClose, onNavigate }: SideDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const transactions = useTransactionStore((s) => s.transactions);
  const budget = useBudgetStore((s) => s.budget);
  const fixedExpenses = useBudgetStore((s) => s.fixedExpenses);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleExport = () => {
    const data = {
      budget,
      fixedExpenses,
      transactions,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gestor-gastos-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onClose();
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.disabled) return;
    if (item.key === 'export') {
      handleExport();
      return;
    }
    onNavigate(item.key as NavTab);
    onClose();
  };

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`}
        onClick={onClose}
      />
      <aside
        ref={drawerRef}
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}
      >
        <div className={styles.header}>
          <span className={styles.brand}>GESTOR DE GASTOS</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar menú">
            <Icon name="close" size={22} />
          </button>
        </div>

        <nav className={styles.menu}>
          {ITEMS.map((item) => (
            <button
              key={item.key}
              className={`${styles.menuItem} ${item.disabled ? styles.menuItemDisabled : ''}`}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
            >
              <Icon name={item.icon} size={20} />
              <span className={styles.menuLabel}>{item.label}</span>
              {item.badge && (
                <span className={styles.badge}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        <div className={styles.footer}>
          <span className={styles.version}>Gestor de Gastos v1.0</span>
        </div>
      </aside>
    </>
  );
}
