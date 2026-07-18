# Design: UI Mockup Implementation

## Technical Approach

Create the missing `budgetStore` and `alertStore` Zustand modules to satisfy all imports in `main.tsx`, then verify the three-screen UI matches the dark-themed mockups. The approach is: store-first (hydrate from Dexie, expose selectors, wire up alert subscriptions), then UI verification (fix title, bell badge, theming consistency). This maps directly to the proposal's "add missing capabilities" scope.

## Architecture Decisions

### Decision: Store Pattern for budgetStore and alertStore

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Separate Zustand stores (budget + alert) | Clean separation, but alertStore needs external store access | **Chosen** — follows existing `transactionStore` pattern |
| Single combined store | Simpler for alerts, but couples budget and UI state | Rejected — breaks existing store separation |
| Redux Toolkit | Overkill for MVP scope | Rejected — adds boilerplate and migration |

**Rationale**: The codebase already uses `zustand` with `create()`. Maintaining the same pattern minimizes cognitive load and keeps each store responsible for one domain. `alertStore` will read `budgetStore` and `transactionStore` via external selectors (not `subscribe` from React, but `getState()` from the module level) to compute alerts.

### Decision: Alert Recalculation Strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Manual `recalculate()` call after every budget/transaction mutation | Explicit, predictable, but callers must remember | **Chosen** — simplest, mirrors spec requirement |
| Zustand `subscribe` inside `alertStore` to auto-recalculate | Automatic, but harder to trace; risk of infinite loops | Rejected — `subscribe` + `setState` on same tick can cause issues |
| Throttled auto-recalculate on store changes | Better UX, but adds complexity and timing bugs | Rejected — MVP does not need real-time alert reactivity |

**Rationale**: The spec explicitly defines `recalculate()` as a manual action. The bootstrap sequence (`main.tsx`) calls `recalculate()` after hydration. After store mutations (budget set, expense add/remove, transaction add), the calling code must explicitly invoke `alertStore.getState().recalculate()`. This is deterministic and testable.

### Decision: Budget Uniqueness

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Enforce single record via Dexie (`db.budgets.clear()` before `add`) | Guarantees one record, simple code | **Chosen** — MVP assumes one budget |
| Allow multiple budgets + selector picks "active" | Future-proof, but complicates UI and selectors | Rejected — UI (Dashboard, Config) has no budget-switching UX |
| Dexie unique constraint on `id` field | Requires schema migration (v2) | Rejected — schema already at v1; unnecessary churn |

**Rationale**: `setBudget` will use `db.budgets.clear()` then `db.budgets.add(newBudget)` to enforce a single record. The `budgets` table technically has no unique constraint, but the application layer guarantees one record. This is documented as a future migration risk.

### Decision: CSS Strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| CSS Custom Properties (current) | Native, no build-time dependency, runtime themable | **Chosen** — already established in `index.css` |
| Tailwind CSS | Utility-first, faster iteration, but adds dependency | Rejected — project is not using Tailwind |
| CSS-in-JS (styled-components) | Scoped styles, but adds runtime cost and library | Rejected — project uses CSS Modules |
| SCSS variables | Compile-time, but requires build step change | Rejected — no Sass setup in Vite config |

**Rationale**: The project uses CSS Modules (`*.module.css`) plus a global `:root` CSS custom properties file (`index.css`). This is a solid, maintainable approach. The design tokens are already defined in `index.css`; we will verify and add any missing tokens rather than changing the approach.

### Decision: Component Decomposition (Shared vs Screen-Specific)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep existing structure (shared components + screen tabs) | Minimal changes, clear separation | **Chosen** — most screens are already built |
| Introduce atomic design (atoms/molecules/organisms) | Better reusability, but heavy refactor | Rejected — out of scope for this change |
| Move all UI to one component file | Fewer files, but harder to maintain | Rejected — violates separation of concerns |

**Rationale**: The existing component tree (`App.tsx` → `DashboardTab` / `ExpensesTab` / `ConfigTab` + `components/*`) is already well-structured. This change only requires creating the two stores and verifying UI styling. No new components are needed.

## Data Flow

### Bootstrap Sequence (main.tsx)

```
main.tsx
  ├── dynamic import budgetStore      ──┐
  ├── dynamic import transactionStore  ├── parallel → hydrate()
  ├── dynamic import alertStore        ──┘
  │
  ├── await hydrate() on budgetStore     ──┐
  ├── await hydrate() on transactionStore  ├── parallel
  │
  ├── subscribeAlertStore() ──→ sets up external store subscription
  │
  ├── useAlertStore.getState().recalculate() ──→ initial alert evaluation
  │
  └── createRoot().render(<App />)
```

### Screen Data Dependencies

```
DashboardTab
  ├── budgetStore: budget, fixedExpenses, selectors
  ├── transactionStore: transactions, selectors
  └── alertStore: alerts

ExpensesTab / TransactionList
  ├── transactionStore: transactions, add/remove
  └── budgetStore: budget (for payDay-based period filtering)

ConfigTab
  └── budgetStore: budget, fixedExpenses, CRUD actions
```

### Action Flow (User Input → Store Update → Re-render)

```
User saves budget in ConfigTab
  → handleSaveBudget() calls budgetStore.setBudget()
  → setBudget writes to Dexie, updates state
  → ConfigTab re-renders (budget changed)
  → (caller must also call alertStore.recalculate() if desired)
  → DashboardTab re-renders (budget changed)

User adds transaction in ExpensesTab
  → addTransaction() writes to Dexie, updates state
  → TransactionList re-renders
  → (caller must call alertStore.recalculate())
  → DashboardTab re-renders (spent values changed)
```

### Alert Evaluation Trigger Points

1. **Initial boot**: `main.tsx` calls `recalculate()` after hydration.
2. **Post-transaction**: After `transactionStore.addTransaction()` / `updateTransaction()` / `removeTransaction()`, the caller should call `alertStore.getState().recalculate()`.
3. **Post-budget change**: After `budgetStore.setBudget()`, `addFixedExpense()`, `removeFixedExpense()`, the caller should call `recalculate()`.
4. **Dismissal**: `alertStore.dismissAlert(id)` removes from in-memory array only.

**Note**: `alertStore` does NOT auto-subscribe to Zustand state changes. Manual recalculation is the contract.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/store/budgetStore.ts` | Create | Zustand store for budget + fixed expenses, with hydration, selectors, CRUD |
| `src/store/alertStore.ts` | Create | Zustand store for alerts, with `recalculate()` reading budget + transaction stores |
| `src/main.tsx` | Modify | Ensure imports resolve; add `alertStore` import; verify bootstrap sequence |
| `src/ui/components/TopAppBar.tsx` | Modify | Change title default to "GESTOR DE GASTOS"; add bell badge for active alerts |
| `src/ui/App.tsx` | Modify | Pass alert count to `TopAppBar` if needed |
| `src/index.css` | Modify | Add missing CSS tokens (verify `--alert-bg`, etc.) |

## Interfaces / Contracts

### budgetStore

```typescript
import { create } from 'zustand';
import type { Budget, FixedExpense } from '@/domain/models';

interface BudgetState {
  budget: Budget | null;
  fixedExpenses: FixedExpense[];
  isHydrated: boolean;

  // Actions
  hydrate: () => Promise<void>;
  setBudget: (data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  addFixedExpense: (data: Omit<FixedExpense, 'id'>) => Promise<void>;
  updateFixedExpense: (id: string, data: Partial<Omit<FixedExpense, 'id'>>) => Promise<void>;
  removeFixedExpense: (id: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>()((set, get) => ({
  // ... implementation
}));

// Selectors (standalone functions, not hooks)
export function selectVariableBudget(): number;
export function selectDailyBudget(): number;
export function selectTotalFixed(): number;
export function selectPeriod(): Period | null;
```

### alertStore

```typescript
import { create } from 'zustand';
import type { Alert } from '@/domain/models';

interface AlertState {
  alerts: Alert[];
  isHydrated: boolean;

  // Actions
  hydrate: () => Promise<void>;  // no-op for MVP (alerts in-memory only)
  recalculate: () => void;
  dismissAlert: (id: string) => void;
}

export const useAlertStore = create<AlertState>()((set, get) => ({
  // ... implementation
}));

// Subscription initializer called from main.tsx
export function subscribeAlertStore(): void;
```

### TopAppBar Props Update

```typescript
interface TopAppBarProps {
  title?: string;           // default: "GESTOR DE GASTOS"
  onMenuClick?: () => void;
  alertCount?: number;      // badge on bell icon
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `budgetStore` selectors with null/empty state | Vitest, mock `useBudgetStore.getState()` |
| Integration | `budgetStore` CRUD + hydration with `fake-indexeddb` | Vitest + jsdom, setup/teardown DB |
| Integration | `alertStore` recalculate with mock budget + transactions | Vitest, inject mock stores via `getState()` |
| Component | `DashboardTab` renders empty state + populated state | @testing-library/react, mock stores |
| Component | `TopAppBar` shows badge when `alertCount > 0` | @testing-library/react |
| E2E | App boots, all imports resolve | `vite build` passes, manual smoke test |

## Migration / Rollout

No migration required. The `budgets` and `fixedExpenses` tables already exist in Dexie v1 schema. Creating stores only adds runtime logic; no data migration is needed.

## Theming / Design Tokens

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0A0A0A` | App background, page base |
| `--bg-card` | `#1E1E1E` | Card surfaces, elevated panels |
| `--bg-surface` | `#141313` | Top app bar, bottom nav, drawer |
| `--text-primary` | `#e5e2e1` | Headings, primary text, amounts |
| `--text-secondary` | `#c4c7c8` | Labels, descriptions, placeholders |
| `--accent` | `#ffffff` | Active nav icons, FAB, primary actions |
| `--action` | `#ffffff` | Buttons, CTA backgrounds |
| `--action-text` | `#0A0A0A` | Text on action buttons |
| `--action-hover` | `#e5e5e5` | Hover state for action buttons |
| `--border` | `#2C2C2C` | Card borders, dividers, input borders |
| `--divider` | `#353434` | Subtle separators inside cards |
| `--success` | `#4caf50` | Savings progress bar |
| `--danger` | `#ffb4ab` | Alert text, overspend indicators |
| `--alert-bg` | `rgba(255,180,171,0.12)` | Alert banner background |
| `--alert-text` | `#ffb4ab` | Alert message text |

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `space-xs` | `4px` | Tight gaps, icon padding |
| `space-sm` | `8px` | Inline gaps, small margins |
| `space-md` | `12px` | Grid gaps, card internal padding |
| `space-lg` | `16px` | Card padding, section internal spacing |
| `space-xl` | `20px` | Large card padding, form spacing |
| `space-2xl` | `24px` | Page padding, section margins |
| `space-3xl` | `32px` | Empty state padding, large gaps |
| `space-4xl` | `48px` | Major section margins |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | `8px` | Buttons, small inputs |
| `radius-md` | `10px` | CTA buttons, chips, alerts |
| `radius-lg` | `12px` | Cards, forms, panels |
| `radius-xl` | `16px` | Balance card (hero) |
| `radius-full` | `9999px` | FAB, pills, icon circles |

### Typography Scale

| Level | Size | Weight | Line-Height | Usage |
|-------|------|--------|-------------|-------|
| Display | `24px` | `700` | `32px` | Balance amount, hero values |
| H1 | `20px` | `600` | `28px` | Screen titles, section headers |
| H2 | `16px` | `600` | `24px` | Card titles, subsection headers |
| Body | `16px` | `400` | `24px` | Primary body text, input values |
| Label | `12px` | `600` | `16px` | Uppercase labels, badges |
| Small | `14px` | `400` | `20px` | Secondary text, descriptions |
| Caption | `11px` | `500` | `16px` | Nav labels, metadata, hints |

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-fab` | `0 4px 24px rgba(0,0,0,0.5)` | Floating action button |
| `shadow-fab-hover` | `0 6px 32px rgba(0,0,0,0.6)` | FAB hover state |
| `shadow-drawer` | `2px 0 24px rgba(0,0,0,0.4)` | Side drawer edge |

## Screen-by-Screen Layout

### Dashboard (DashboardTab)

**Component Composition Tree:**
```
DashboardTab
  ├── Card (variant="balance")
  │   ├── cardLabel: "BALANCE DISPONIBLE DEL MES"
  │   ├── balanceAmount: format(remainingPeriod)
  │   └── trendLine (savingsProgress indicator)
  ├── Grid (2 columns)
  │   └── Card ×4 (sueldo, gastado, restante, meta)
  ├── ProgressBar ("Presupuesto mensual")
  ├── ProgressBar ("Progreso de ahorro", variant="savings")
  ├── TransactionRow[] (Gastos Variables, sorted by spent desc)
  ├── Card (Gastos Fijos list)
  └── Alert banners (if any)
```

**Data Requirements:**
- `budgetStore.budget` (null → empty state)
- `budgetStore.fixedExpenses`
- `selectVariableBudget()`, `selectTotalFixed()`, `selectDailyBudget()`
- `selectSpentPeriod(budget.payDay)`, `selectSpentCategoryPeriod(cat, payDay)`
- `alertStore.alerts`

**Key Interactions:**
- "Ir a configuración" CTA → navigates to Config tab
- "VER TODOS" → navigates to Expenses tab
- Fixed expenses list is read-only here

**Responsive:** Mobile-first, `max-width: 512px` centered. 2-column grid on all sizes. Touch targets ≥44px.

### Historial (ExpensesTab / TransactionList)

**Component Composition Tree:**
```
ExpensesTab
  ├── form (add transaction)
  │   ├── amount input
  │   ├── actualAmount input (optional)
  │   ├── category select
  │   ├── date input
  │   ├── note input
  │   └── submit button
  └── TransactionList
      ├── summaryCard ("GASTO TOTAL DEL MES")
      ├── filter chips (Todas + categories)
      └── date groups (HOY / AYER / FECHAS ANTERIORES)
          └── item rows (icon, name, category, amount, date, delete)
```

**Data Requirements:**
- `transactionStore.transactions`, `addTransaction`, `removeTransaction`
- `budgetStore.budget` (for period filtering)
- `selectPeriodTransactions(payDay)`
- `selectCategoryTransactions(category)`

**Key Interactions:**
- Form submit → adds transaction, resets form, stays on screen
- Category chips → filters list
- Delete button → removes transaction
- `actualAmount` split support for shared expenses

**Responsive:** Same max-width, full-width form fields. Filter chips horizontal scroll if needed.

### Configuración (ConfigTab)

**Component Composition Tree:**
```
ConfigTab
  ├── Info card (explanatory text)
  ├── Form (Presupuesto)
  │   ├── salary input (ARS)
  │   ├── payDay input (1-31)
  │   ├── savingsGoal input (ARS)
  │   └── submit button
  ├── Resumen calculado (variable, daily, fixed total)
  └── Gastos Fijos section
      ├── inline add form
      ├── table (name + amount + actions)
      └── edit inline mode
```

**Data Requirements:**
- `budgetStore.budget`, `fixedExpenses`
- `budgetStore.setBudget`, `addFixedExpense`, `updateFixedExpense`, `removeFixedExpense`
- `selectVariableBudget()`, `selectDailyBudget()`, `selectTotalFixed()`

**Key Interactions:**
- Save budget → persists to Dexie, shows computed summary
- Add fixed expense → inline form, persists immediately
- Edit → inline inputs replace row, save on confirm
- Delete → immediate removal with Dexie sync

**Responsive:** Same max-width. Table rows stack vertically. Touch targets for edit/delete buttons ≥44px.

## PR Slicing Strategy

### PR 1: Stores + Boot Fixes

**Scope:**
- Create `src/store/budgetStore.ts` (full CRUD, hydration, selectors)
- Create `src/store/alertStore.ts` (recalculate, dismiss, subscription)
- Update `src/main.tsx` to resolve imports cleanly
- Add unit + integration tests for both stores

**Dependencies:** None — this is the foundation.

**Verification:**
- `npm run test` passes for new store tests
- `npm run build` succeeds with no import errors
- App boots in browser with no console errors

### PR 2: UI Polish + Theming

**Scope:**
- Update `TopAppBar.tsx` title to "GESTOR DE GASTOS", add bell badge
- Wire `App.tsx` to pass alert count to `TopAppBar`
- Verify CSS custom properties match spec tokens
- Verify all screens render with correct dark theme
- Component tests for `DashboardTab`, `TopAppBar`

**Dependencies:** PR 1 (stores must exist to test UI with real data).

**Verification:**
- `npm run test` passes for component tests
- `npm run build` succeeds
- Manual visual check: dark theme, card radii 16px, touch targets ≥44px

### PR 3: Alert Recalculation + Integration

**Scope:**
- Add `alertStore.recalculate()` calls after all budget/transaction mutations
- Integration test: full flow from budget creation → transaction → alert display
- Verify bell badge updates when alerts appear

**Dependencies:** PR 1 and PR 2.

**Verification:**
- `npm run test` passes for alert integration tests
- Manual: trigger a risk category transaction → alert banner appears in Dashboard

## Open Questions

1. ✅ **Budget uniqueness**: Resolved — single budget record enforced in Dexie via `db.budgets.clear()` before add. Future multi-budget support requires schema migration and UI redesign.
2. ✅ **Alert persistence**: Resolved — alerts are in-memory only (computed on-the-fly via `evaluateAlerts`). No Dexie persistence. `alertStore.hydrate()` is a no-op for MVP.
3. ✅ **ConfigTab validation**: Resolved — no strict min/max for MVP. ARS prefix is a UI label (not part of stored value). The input `type="number"` with `min="0"` is sufficient.

**No remaining open questions.**

## Next Recommended Phase

`sdd-tasks` — break down into implementation checklist.
