import { Icon } from './Icon';
import type { IconName } from './Icon';
import styles from './BottomNav.module.css';

export type NavTab = 'dashboard' | 'expenses' | 'historial' | 'config';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

interface TabDef {
  key: NavTab;
  label: string;
  icon: IconName;
}

const TABS: TabDef[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'historial', label: 'Historial', icon: 'history' },
  { key: 'config', label: 'Configuración', icon: 'settings' },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            onClick={() => onTabChange(tab.key)}
            aria-label={tab.label}
          >
            <Icon name={tab.icon} size={22} className={isActive ? styles.activeIcon : styles.icon} />
            <span className={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
