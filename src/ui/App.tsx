import { useState } from 'react';
import { DashboardTab } from './Dashboard/DashboardTab';
import { ExpensesTab } from './Expenses/ExpensesTab';
import { HistorialTab } from './Historial/HistorialTab';
import { ConfigTab } from './Config/ConfigTab';
import { TopAppBar } from './components/TopAppBar';
import { BottomNav } from './components/BottomNav';
import type { NavTab } from './components/BottomNav';
import { FAB } from './components/FAB';
import { SideDrawer } from './components/SideDrawer';
import { useAlertStore } from '@/store/alertStore';
import { useBudgetStore } from '@/store/budgetStore';
import styles from './App.module.css';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const alerts = useAlertStore((s) => s.alerts);
  const alertCount = alerts.length;
  const dismissAlert = useAlertStore((s) => s.dismissAlert);
  const hasBudget = useBudgetStore((s) => !!s.budget);

  return (
    <div className={styles.app}>
      <TopAppBar alertCount={alertCount} alerts={alerts} onDismissAlert={dismissAlert} onMenuClick={() => setDrawerOpen(true)} />
      <SideDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={setActiveTab}
      />
      <main className={styles.main}>
        {activeTab === 'dashboard' && (
          <div className={styles.tabContent}>
            <DashboardTab onNavigate={setActiveTab} />
          </div>
        )}
        {activeTab === 'expenses' && <div className={styles.tabContent}><ExpensesTab /></div>}
        {activeTab === 'historial' && <div className={styles.tabContent}><HistorialTab onNavigate={setActiveTab} /></div>}
        {activeTab === 'config' && <div className={styles.tabContent}><ConfigTab /></div>}
      </main>
      {hasBudget && (activeTab === 'dashboard' || activeTab === 'historial') && (
        <FAB onClick={() => setActiveTab('expenses')} />
      )}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
