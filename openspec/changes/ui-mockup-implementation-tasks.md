# Tasks: UI Mockup Implementation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~600 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Fix stores + boot sequence + theme tokens | PR 1 | Base for all UI work |
| 2 | Polish UI + wire alert badge | PR 2 | Depends on PR 1 stores |
| 3 | Wire manual recalc + integration tests | PR 3 | Depends on PR 1 + PR 2 |

## Pre-requisites

- [ ] `fake-indexeddb` configured in `vite.config.ts` (verified: done)
- [ ] All 3 screen tabs and shared components exist (verified: done)
- [ ] `budgetStore.ts` and `alertStore.ts` exist but need fixes (verified: done)

---

## PR-1: Stores + Boot Fixes (~250 lines)

**Base branch**: `feature/ui-mockup-implementation`

### Tasks

- [ ] 1.1 Modify `src/store/budgetStore.ts`: change `setBudget` from `db.budgets.put()` to `db.budgets.clear()` + `db.budgets.add()` to enforce exactly one budget record
- [ ] 1.2 Modify `src/store/alertStore.ts`: remove `subscribeAlertStore()` export and internal subscription logic
- [ ] 1.3 Modify `src/store/alertStore.ts`: add `isHydrated: boolean` state and `hydrate()` no-op action
- [ ] 1.4 Modify `src/store/alertStore.ts`: add `dismissAlert(id: string)` action that filters `alerts` array
- [ ] 1.5 Modify `src/main.tsx`: remove `subscribeAlertStore()` call; keep manual `recalculate()` after hydration
- [ ] 1.6 Modify `src/index.css`: add spacing tokens (`--space-xs` to `--space-4xl`)
- [ ] 1.7 Modify `src/index.css`: add radius tokens (`--radius-sm` to `--radius-full`)
- [ ] 1.8 Modify `src/index.css`: add typography tokens (`--font-display` to `--font-caption`)
- [ ] 1.9 Modify `src/index.css`: add shadow tokens (`--shadow-fab`, `--shadow-fab-hover`, `--shadow-drawer`)
- [ ] 1.10 Modify `src/store/stores.test.ts`: remove `subscribeAlertStore` auto-subscribe test
- [ ] 1.11 Modify `src/store/stores.test.ts`: add `hydrate` and `dismissAlert` unit tests for `alertStore`
- [ ] 1.12 Modify `src/store/stores.test.ts`: update singleton assertion in `setBudget` test to verify `db.budgets` has exactly 1 record

### Acceptance Criteria

- `vitest run src/store/stores.test.ts` passes
- `npm run build` succeeds with zero errors
- `db.budgets.toArray()` returns max 1 record after any `setBudget` call
- `alertStore` has no auto-subscription to other stores

### Rollback Plan

1. Revert `budgetStore.ts` to `db.budgets.put()`
2. Restore `subscribeAlertStore()` in `alertStore.ts` and `main.tsx`
3. Revert `index.css` token additions
4. Revert `stores.test.ts` changes

### Verification Steps

- [ ] Run `npm run test` — all store tests pass
- [ ] Run `npm run build` — no TypeScript or bundling errors
- [ ] Open app in browser — DevTools console shows zero import/runtime errors
- [ ] Dexie inspector shows `budgets` table never exceeds 1 row

---

## PR-2: UI Polish + Theming (~200 lines)

**Base branch**: PR-1 branch (targets `feature/ui-mockup-implementation`)

### Tasks

- [ ] 2.1 Modify `src/ui/components/TopAppBar.tsx`: change default title to `"GESTOR DE GASTOS"`
- [ ] 2.2 Modify `src/ui/components/TopAppBar.tsx`: add `alertCount?: number` prop
- [ ] 2.3 Modify `src/ui/components/TopAppBar.tsx`: render red badge dot on bell icon when `alertCount > 0`
- [ ] 2.4 Modify `src/ui/components/TopAppBar.module.css`: add `.badge` styles (absolute positioned dot)
- [ ] 2.5 Modify `src/ui/App.tsx`: import `useAlertStore`, compute `alertCount = alerts.length`, pass to `TopAppBar`
- [ ] 2.6 Modify `src/ui/components/Card.module.css`: replace hardcoded `border-radius: 12px` with `var(--radius-lg)`
- [ ] 2.7 Modify `src/ui/components/ProgressBar.module.css`: replace hardcoded font sizes with `var(--font-label)` and `var(--font-small)`
- [ ] 2.8 Modify `src/ui/Dashboard/DashboardTab.module.css`: replace hardcoded spacing values with `var(--space-*)` tokens
- [ ] 2.9 Modify `src/ui/App.module.css`: replace hardcoded padding with `var(--space-2xl)` and `var(--space-3xl)`
- [ ] 2.10 Create `src/ui/components/TopAppBar.test.tsx`: test default title, badge renders when `alertCount > 0`, no badge when 0
- [ ] 2.11 Create `src/ui/Dashboard/DashboardTab.test.tsx`: test empty state renders CTA, populated state renders balance amount

### Acceptance Criteria

- TopAppBar title reads "GESTOR DE GASTOS"
- Bell icon shows red dot when `alertCount > 0`
- All card surfaces use `--bg-card` and `--radius-lg`
- Component tests pass
- Manual visual check confirms dark theme and touch targets ≥44px

### Rollback Plan

1. Revert `TopAppBar.tsx` title to `"FINANCE"` and remove `alertCount` prop
2. Revert `App.tsx` to not pass alert count
3. Revert CSS module token replacements to hardcoded values
4. Delete new test files

### Verification Steps

- [ ] Run `vitest run src/ui/components/TopAppBar.test.tsx` — passes
- [ ] Run `vitest run src/ui/Dashboard/DashboardTab.test.tsx` — passes
- [ ] Run `npm run build` — succeeds
- [ ] Manual browser check: dark theme, badge appears with active alerts

---

## PR-3: Alert Recalculation + Integration (~150 lines)

**Base branch**: PR-2 branch

### Tasks

- [ ] 3.1 Modify `src/ui/Config/ConfigTab.tsx`: call `useAlertStore.getState().recalculate()` after `setBudget` in `handleSaveBudget`
- [ ] 3.2 Modify `src/ui/Config/ConfigTab.tsx`: call `recalculate()` after `addFixedExpense` in `handleAddExpense`
- [ ] 3.3 Modify `src/ui/Config/ConfigTab.tsx`: call `recalculate()` after `updateFixedExpense` in `handleEdit`
- [ ] 3.4 Modify `src/ui/Config/ConfigTab.tsx`: call `recalculate()` after `removeFixedExpense` invocation
- [ ] 3.5 Modify `src/ui/Expenses/ExpensesTab.tsx`: call `recalculate()` after `addTransaction` in `handleSubmit`
- [ ] 3.6 Modify `src/ui/Dashboard/DashboardTab.tsx`: add dismiss button per alert banner calling `useAlertStore.getState().dismissAlert(a.id)`
- [ ] 3.7 Modify `src/store/stores.test.ts`: add integration test — set budget → add transaction → `recalculate()` → alert present → `dismissAlert()` → alert gone
- [ ] 3.8 Modify `src/store/stores.test.ts`: add test verifying `dismissAlert` removes only targeted alert

### Acceptance Criteria

- Budget save and fixed-expense mutations trigger alert re-evaluation
- Transaction add triggers alert re-evaluation
- Dashboard alert banners have working dismiss buttons
- Integration test covers end-to-end alert lifecycle

### Rollback Plan

1. Remove `recalculate()` calls from ConfigTab handlers
2. Remove `recalculate()` call from ExpensesTab `handleSubmit`
3. Remove dismiss UI from DashboardTab alerts
4. Revert integration test additions in `stores.test.ts`

### Verification Steps

- [ ] Run `vitest run src/store/stores.test.ts` — all tests pass including integration
- [ ] Manual: add $100k Timba/Casino transaction → Dashboard shows daily alert → dismiss removes it
- [ ] Run `npm run build` — succeeds

---

## Risk Flags

| Task | Risk Level | Reason |
|------|------------|--------|
| 1.2 + 1.3 (remove auto-subscribe) | Medium | Changes runtime alert behavior; UI components must remember to call `recalculate()` manually |
| 2.1–2.5 (TopAppBar badge) | Low | Isolated component change, well-scoped |
| 3.1–3.5 (manual recalc wiring) | Medium | Easy to miss a mutation path; requires careful audit of all ConfigTab and ExpensesTab handlers |
| 3.7 (integration test) | Low | Pure test addition, no production code risk |

## Total Task Count

- **PR-1**: 12 tasks
- **PR-2**: 11 tasks
- **PR-3**: 8 tasks
- **Total**: 31 tasks

## Next Recommended Phase

`apply` — implementation can begin with PR-1 slice.
