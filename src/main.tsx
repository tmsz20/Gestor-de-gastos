import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/ui/App';
import './index.css';

// Inicializar stores desde Dexie antes de renderizar
async function bootstrap() {
  const [{ useBudgetStore }, { useTransactionStore }] =
    await Promise.all([
      import('@/store/budgetStore'),
      import('@/store/transactionStore'),
    ]);

  await Promise.all([
    useBudgetStore.getState().hydrate(),
    useTransactionStore.getState().hydrate(),
  ]);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();
