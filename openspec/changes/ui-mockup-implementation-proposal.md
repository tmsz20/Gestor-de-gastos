# Proposal: Three-Screen UI Implementation

## Intent
Implement the complete user interface for the Gestor de Gastos PWA, matching exactly the three provided mockup screens: **Dashboard**, **Configuration**, and **History**. The UI must be pixel-accurate to the dark-themed, card-based mobile design with bottom tab navigation.

## Scope

### In Scope
- **Dashboard screen**: Balance card, 4 summary stat cards, monthly budget progress bar, variable expenses list with icons, fixed expenses card, floating "Nuevo Gasto" button
- **Configuration screen**: Header info card, salary input with ARS prefix, fixed expenses table with add/remove, savings goal card with progress bar, distribution summary card, save/cancel actions
- **History screen**: Monthly total card with comparison, search bar with filter button, chronological transaction list grouped by date (Today, Yesterday, Earlier), floating add button
- **Bottom navigation**: 3 tabs (Dashboard, Historial, Configuración) with active state
- **Top bar**: Hamburger menu, "FINANCE" title, notification bell
- **Global dark theme**: `#121212` background, `#1E1E1E` card surfaces, white text, subtle borders
- **Routing**: Tab-based navigation between the 3 screens
- **Missing stores**: `budgetStore.ts` and `alertStore.ts` (referenced in `main.tsx` but unimplemented)

### Out of Scope
- Backend sync (v2 feature)
- Push notifications (bell icon is decorative for MVP)
- Side drawer menu (hamburger is decorative for MVP)
- Transaction detail/edit screen (covered in Historial but editing out of scope)
- Charts or graphs (not in mockups)

## Approach

### Architecture
- **Mobile-first, single-column layout** optimized for iPhone viewport
- **Component decomposition**: Shared card component, shared input component, shared list item component, bottom nav component
- **CSS**: Pure CSS with CSS custom properties for theming (no CSS-in-JS library needed)
- **State**: Extend existing Zustand stores. Budget store for salary/fixed expenses config. Alert store for notification state.

### Styling Strategy
- CSS custom properties in `:root` for colors, spacing, border-radius
- Card pattern: `background: #1E1E1E`, `border-radius: 16px`, `padding: 16px-20px`
- Input pattern: dark background with white text, ARS prefix label
- Typography: System font stack (San Francisco on iOS, Segoe on Windows)
- Touch targets: Minimum 44px for buttons

### Data Flow
1. `budgetStore` hydrates from Dexie on boot → provides salary, fixed expenses, pay day, savings goal
2. `transactionStore` provides transactions → Dashboard calculates summaries via existing `calculator.ts`
3. `alertStore` consumes budget + transaction changes → evaluates alerts via existing `evaluateAlerts`
4. UI reads from stores, writes via store actions

### Implementation Order (for chained PRs)
1. **PR-1: Foundation** — Global styles, theme tokens, routing shell, bottom nav, top bar
2. **PR-2: Dashboard** — Dashboard screen with all cards and summary logic
3. **PR-3: Configuration** — Config screen with forms, fixed expenses CRUD, savings card
4. **PR-4: History** — History screen with search, filters, transaction list, date grouping

## Risks
- **Size risk**: HIGH. 4 PRs estimated, ~650 total lines changed. Exceeds 400-line review budget per PR.
- **Cross-PR dependency**: PR-2 and PR-3 both depend on PR-1 (routing + stores). PR-4 depends on transactionStore existing.
- **Visual fidelity**: Mockups are screenshots, not designs with exact measurements. Some padding/spacing may need iteration.
- **Store gap**: `budgetStore.ts` and `alertStore.ts` must be created before any screen works.

## Definition of Done
- [ ] All 3 screens render and match mockup layout
- [ ] Bottom navigation switches between screens
- [ ] Dark theme is consistent across all screens
- [ ] Config screen persists data to Dexie via budgetStore
- [ ] Dashboard reads from budgetStore + transactionStore
- [ ] History lists transactions from transactionStore
- [ ] App boots without errors (all imports resolve)
