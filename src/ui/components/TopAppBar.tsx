import { useState } from 'react';
import { Icon } from './Icon';
import type { Alert } from '@/domain/models';
import styles from './TopAppBar.module.css';

interface TopAppBarProps {
  title?: string;
  alertCount?: number;
  alerts?: Alert[];
  onDismissAlert?: (id: string) => void;
  onMenuClick?: () => void;
}

export function TopAppBar({
  title = 'GESTOR DE GASTOS',
  alertCount = 0,
  alerts = [],
  onDismissAlert,
  onMenuClick,
}: TopAppBarProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  const togglePanel = () => {
    setPanelOpen((prev) => !prev);
  };

  return (
    <header className={styles.header}>
      <button className={styles.leading} onClick={onMenuClick} aria-label="Menú">
        <Icon name="menu" size={22} />
      </button>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.trailing}>
        <button className={styles.bellBtn} onClick={togglePanel} aria-label="Notificaciones">
          <Icon name="bell" size={20} />
          {alertCount > 0 && (
            <span className={styles.badge}>{alertCount}</span>
          )}
        </button>

        {/* Alert Panel */}
        {panelOpen && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Notificaciones</span>
              <button className={styles.panelClose} onClick={() => setPanelOpen(false)}>
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className={styles.panelContent}>
              {alerts.length === 0 ? (
                <div className={styles.emptyAlerts}>
                  <Icon name="bell" size={24} />
                  <span>No hay alertas activas</span>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className={styles.alertItem}>
                    <div className={styles.alertDot} />
                    <div className={styles.alertBody}>
                      <span className={styles.alertMessage}>{alert.message}</span>
                      <span className={styles.alertType}>{alert.type === 'daily' ? 'Diaria' : alert.type === 'period' ? 'Período' : alert.type === 'ropa_calzado' ? 'Ropa/Calzado' : 'Imprevistos'}</span>
                    </div>
                    <button
                      className={styles.alertDismiss}
                      onClick={() => {
                        onDismissAlert?.(alert.id);
                        if (alerts.length === 1) setPanelOpen(false);
                      }}
                      aria-label="Descartar alerta"
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
