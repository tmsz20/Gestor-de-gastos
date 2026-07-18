# Delta Spec: UI Mockup Implementation

## Purpose

Implement the missing `budgetStore` and `alertStore` so the existing three-screen UI (Dashboard, Historial, Configuración) renders and matches the dark-themed mobile mockups. Ensure the app boots without import errors.

## ADDED Requirements

### Requirement: budgetStore MUST hydrate from Dexie

The system MUST create a Zustand store that loads the single `Budget` record and all `FixedExpense` records from Dexie on boot.

#### Scenario: Boot with existing data
- GIVEN Dexie contains a budget and fixed expenses
- WHEN `budgetStore.getState().hydrate()` is called
- THEN `budget` is populated and `fixedExpenses` has items
- AND `isHydrated` becomes true

#### Scenario: Boot with empty database
- GIVEN Dexie has no budget and no fixed expenses
- WHEN `budgetStore.getState().hydrate()` is called
- THEN `budget` is null, `fixedExpenses` is empty, and `isHydrated` is true

### Requirement: budgetStore MUST expose computed selectors

The system MUST expose pure selectors that compute `variableBudget`, `dailyBudget`, `totalFixed`, and `currentPeriod` using existing `calculator.ts` functions.

#### Scenario: Full budget calculation
- GIVEN budget with salary=500000, payDay=5, savingsGoal=50000 and fixed expenses totaling 150000
- WHEN `selectVariableBudget()` is called
- THEN it returns 300000
- AND `selectDailyBudget()` returns the daily amount based on current period days

#### Scenario: Null budget
- GIVEN budget is null
- WHEN any selector is called
- THEN it returns 0 or null safely without throwing

### Requirement: budgetStore MUST support budget CRUD

The system MUST support `setBudget`, `addFixedExpense`, `updateFixedExpense`, `removeFixedExpense` with immediate Dexie persistence.

#### Scenario: Set budget
- GIVEN no budget exists
- WHEN `setBudget({ salaryAmount, payDay, savingsGoal })` is called
- THEN Dexie `budgets` table has one record and store state updates

#### Scenario: Add fixed expense
- GIVEN budget exists
- WHEN `addFixedExpense({ name, amount })` is called
- THEN a new `FixedExpense` with generated UUID is added to Dexie and store state

#### Scenario: Remove fixed expense
- GIVEN 3 fixed expenses exist
- WHEN `removeFixedExpense(id)` is called
- THEN the record is deleted from Dexie and store state

### Requirement: alertStore MUST evaluate and expose alerts

The system MUST create a Zustand store that consumes `budgetStore` and `transactionStore` state to evaluate alerts via `evaluateAlerts()`.

#### Scenario: Recalculate alerts
- GIVEN budget and transactions exist
- WHEN `alertStore.getState().recalculate()` is called
- THEN alerts are computed using `evaluateAlerts()` and the `alerts` array updates

#### Scenario: Risk category alert
- GIVEN daily budget is 10000 and Timba/Casino spent today is 6000
- WHEN recalculate is called
- THEN a daily alert for Timba/Casino is in the array

#### Scenario: Alert deduplication
- GIVEN same alert conditions exist
- WHEN recalculate is called twice
- THEN alerts array contains unique alerts only (no duplicates by id)

### Requirement: App MUST boot without import errors

The system MUST ensure all imports in `main.tsx` resolve at runtime.

#### Scenario: Production boot
- GIVEN the app bundle is built
- WHEN it loads in the browser
- THEN `budgetStore` and `alertStore` modules resolve
- AND stores hydrate successfully with no uncaught errors

### Requirement: UI MUST match dark theme mockups

The system MUST use existing CSS custom properties for consistent dark theming across all screens.

#### Scenario: Theme consistency
- GIVEN any screen is rendered
- THEN background uses `--bg-primary` (#0A0A0A)
- AND card surfaces use `--bg-card` (#1E1E1E)
- AND text uses `--text-primary` (#e5e2e1)
- AND border-radius for cards is 16px
- AND touch targets are minimum 44px

## MODIFIED Requirements

None — this change adds new capabilities without altering existing behavior.

## REMOVED Requirements

None.

## Store Interfaces

### budgetStore

| Property | Type | Description |
|----------|------|-------------|
| budget | Budget \| null | Single budget config |
| fixedExpenses | FixedExpense[] | Monthly fixed expenses |
| isHydrated | boolean | True after initial load |

| Selector | Returns | Description |
|----------|---------|-------------|
| selectVariableBudget | number | salary - fixed - savings |
| selectDailyBudget | number | variable / period days |
| selectTotalFixed | number | Sum of fixed expenses |
| selectPeriod | Period | Current period based on payDay |

| Action | Params | Description |
|--------|--------|-------------|
| hydrate | none | Load from Dexie |
| setBudget | Partial budget fields | Upsert budget record |
| addFixedExpense | Omit<FixedExpense, 'id'> | Add with generated UUID |
| updateFixedExpense | id, Partial | Update by id |
| removeFixedExpense | id | Delete by id |

### alertStore

| Property | Type | Description |
|----------|------|-------------|
| alerts | Alert[] | Active alerts |
| isHydrated | boolean | True after initial load |

| Action | Params | Description |
|--------|--------|-------------|
| hydrate | none | Load from Dexie (if persisted) |
| recalculate | none | Re-evaluate all alert rules |
| dismissAlert | id | Remove alert from state |

## Data Flow

1. **Boot**: `main.tsx` imports stores → calls `hydrate()` on budgetStore and transactionStore → subscribes alertStore
2. **Dashboard**: Reads `budgetStore` (budget, fixedExpenses) + `transactionStore` (transactions) → computes via selectors → renders cards
3. **Config**: Reads/writes `budgetStore` → forms update store → store persists to Dexie
4. **Historial**: Reads `transactionStore` → lists transactions grouped by date
5. **Alerts**: `alertStore` watches store changes → calls `recalculate()` → Dashboard renders alerts

## Component Inventory

| Component | Status | Action |
|-----------|--------|--------|
| `src/store/budgetStore.ts` | Missing | CREATE |
| `src/store/alertStore.ts` | Missing | CREATE |
| `src/ui/App.tsx` | Exists | VERIFY (no changes expected) |
| `src/ui/Dashboard/DashboardTab.tsx` | Exists | VERIFY styling matches mockups |
| `src/ui/Expenses/ExpensesTab.tsx` | Exists | VERIFY styling matches mockups |
| `src/ui/Config/ConfigTab.tsx` | Exists | VERIFY styling matches mockups |
| `src/ui/components/*` | Exists | VERIFY styling matches mockups |

## CSS / Theming Requirements

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0A0A0A` | App background |
| `--bg-card` | `#1E1E1E` | Card surfaces |
| `--bg-surface` | `#141313` | Elevated surfaces |
| `--text-primary` | `#e5e2e1` | Headings, primary text |
| `--text-secondary` | `#c4c7c8` | Labels, secondary text |
| `--accent` | `#ffffff` | Active nav, icons, FAB |
| `--border` | `#2C2C2C` | Card borders, dividers |
| `--danger` | `#ffb4ab` | Alert text, overspend |
| `--alert-bg` | `rgba(255,180,171,0.12)` | Alert banner background |

| Property | Value |
|----------|-------|
| Card border-radius | `16px` |
| Card padding | `16px` to `20px` |
| Button touch target | `min 44px` |
| Bottom nav height | `~64px` |
| Top app bar height | `~56px` |

## Test Considerations

| Layer | What to test | Tool |
|-------|-------------|------|
| Unit | `calculator.ts` selectors (already exists) | Vitest |
| Integration | `budgetStore` CRUD with `fake-indexeddb` | Vitest + jsdom |
| Integration | `alertStore` recalculate with mock data | Vitest + jsdom |
| Component | `DashboardTab` renders empty state + populated state | @testing-library/react |
| Component | `ConfigTab` form submits update store | @testing-library/react |
| E2E | App boots, all imports resolve | Build + manual |

## Open Questions

1. **Budget uniqueness**: Should `budgets` table enforce exactly one record? The UI assumes a single budget.
2. **Alert persistence**: Should alerts be persisted to Dexie or kept in-memory only? The proposal does not specify.
3. **ConfigTab validation**: What are the min/max values for salary and savings? The proposal says "input with ARS prefix" — should the UI show "ARS" text?

## Chained PR Recommendation

| PR | Scope | Est. Lines |
|----|-------|-----------|
| 1 | `budgetStore` + `alertStore` + boot fixes | ~250 |
| 2 | UI polish / theming verification | ~200 |

**Total**: ~450 lines → **Chained PRs recommended: Yes**
**Budget risk**: Medium (2 PRs, each under 400 lines)
