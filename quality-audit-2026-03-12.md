# Frontend Quality Audit - 2026-03-12

Scope: React/Tailwind frontend in `/Users/xlz/Documents/Code/herculito`

Checks run:
- `pnpm lint` - passed
- `pnpm build` - passed
- Manual code audit across accessibility, performance, theming, responsive design, and frontend-design anti-patterns

Build notes:
- Main bundle: `dist/assets/index-CNXInJKR.js` - 250.53 kB / 75.83 kB gzip
- Largest route chunks: `DashboardPage` 58.77 kB, `RoutinesPage` 59.51 kB, `AdminPage` 34.11 kB

## Anti-Patterns Verdict

Verdict: **Fail, but not beyond repair.**

This does not read like generic purple-gradient SaaS, and the typography/token work is better than typical AI output. Still, several areas show strong AI-generated tells:

- Equal-weight stat-card grids dominate key surfaces instead of establishing stronger information hierarchy: `src/features/dashboard/pages/DashboardPage.tsx:571`, `src/features/dashboard/pages/DashboardPage.tsx:636`, `src/features/admin/components/AdminSummaryCards.tsx:8`
- Decorative gradient/glass panels appear without a single, disciplined visual system: `src/features/admin/components/AdminControlPanel.tsx:39`, `src/features/dashboard/components/ExerciseProgressPanel.tsx:254`, `src/app/navigation/Navigation.tsx:67`
- The muscle-group rainbow palette runs outside the design-token system, creating a second design language: `src/features/dashboard/lib/muscleGroups.ts:5`
- Some copy narrates what the UI already shows, which makes the experience feel machine-written instead of edited: `src/features/dashboard/components/ExerciseProgressPanel.tsx:267`, `src/features/dashboard/components/ExerciseProgressPanel.tsx:399`, `src/features/dashboard/components/ExerciseProgressPanel.tsx:579`
- Persistent pulse motion in bottom navigation feels like an attention hack rather than purposeful motion: `src/app/navigation/Navigation.tsx:88`

## Executive Summary

- Total issues: **16**
- Severity mix: **0 critical**, **5 high**, **7 medium**, **4 low**
- Overall quality score: **7/10**
- Most critical issues:
  1. Several important controls are missing accessible names or labels
  2. Nested dialogs create competing focus traps
  3. Small `text-slate-500` copy fails contrast on dark surfaces
  4. Tabs and calendar interactions are not exposed semantically to assistive tech
  5. Token bypass and hard-coded color systems are spreading in dashboard/admin surfaces
- Recommended next steps:
  1. Fix the a11y blockers first with `/harden`
  2. Normalize the color system and remove token bypass with `/normalize`
  3. Address performance hotspots with `/optimize`
  4. Clean up responsive/admin layout constraints with `/adapt`
  5. Reduce AI-slop signals and redundant UI copy with `/distill`, `/quieter`, and `/critique`

## Detailed Findings by Severity

### Critical Issues

No confirmed WCAG A blockers were found in this pass. The app remains usable, but several **High** issues should be treated as release-quality blockers.

### High-Severity Issues

#### 1) Unlabeled controls in routines and admin flows
- **Location**: `src/features/routines/components/ExerciseSelectorTemplateList.tsx:37`, `src/features/routines/components/ExerciseSelectorTemplateList.tsx:47`, `src/features/dashboard/components/MuscleGroupSelector.tsx:62`, `src/features/admin/components/AdminUsersSection.tsx:54`, `src/features/admin/components/AdminSessionsSection.tsx:43`, `src/features/admin/components/AdminRoutinesSection.tsx:22`
- **Severity**: High
- **Category**: Accessibility
- **Description**: Search, select, and sort controls are rendered without programmatic labels. Some rely on placeholder text or nearby prose only.
- **Impact**: Screen reader users may hear unnamed controls or lose context about what each filter changes.
- **WCAG/Standard**: WCAG 2.2 - 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions, 4.1.2 Name, Role, Value
- **Recommendation**: Add visible `<label>` elements or `aria-label` where a visible label is not appropriate; connect validation/help text with `aria-describedby`.
- **Suggested command**: `/harden`

#### 2) Icon-only edit/delete controls do not expose accessible names
- **Location**: `src/features/routines/components/RoutineEditor.tsx:253`, `src/features/routines/components/RoutineEditor.tsx:264`
- **Severity**: High
- **Category**: Accessibility
- **Description**: Exercise action buttons are icon-only and use `title`, which is not a reliable accessible name.
- **Impact**: Screen reader users may encounter ambiguous buttons and mobile users get small hit areas with no textual clue.
- **WCAG/Standard**: WCAG 2.2 - 4.1.2 Name, Role, Value; 2.5.8 Target Size (Minimum)
- **Recommendation**: Add `aria-label` values that include the exercise name and increase hit areas to at least 44x44 where these remain standalone controls.
- **Suggested command**: `/harden`

#### 3) Nested dialogs create competing focus traps
- **Location**: `src/features/routines/components/RoutineEditor.tsx:38`, `src/features/routines/components/RoutineEditor.tsx:346`, `src/features/routines/components/ExerciseSelector.tsx:107`, `src/features/routines/components/ExerciseSelector.tsx:250`, `src/shared/hooks/useDialogA11y.ts:26`
- **Severity**: High
- **Category**: Accessibility
- **Description**: `RoutineEditor` stays mounted as an active modal while `ExerciseSelector` opens another modal on top of it. Both attach focus-trap behavior and both claim `aria-modal="true"`.
- **Impact**: Keyboard users and screen reader users can get trapped in conflicting dialog semantics, especially during nested editing flows.
- **WCAG/Standard**: WCAG 2.2 - 2.1.2 No Keyboard Trap, 1.3.1 Info and Relationships, ARIA Dialog Pattern
- **Recommendation**: Use a single modal stack manager, or suspend the parent dialog's trap and hide it from assistive tech while the child dialog is open.
- **Suggested command**: `/harden`

#### 4) Repeated small-text contrast failures on dark surfaces
- **Location**: `src/features/dashboard/components/ExerciseProgressPanel.tsx:284`, `src/features/admin/components/AdminControlPanel.tsx:93`, `src/features/admin/components/AdminUsersSection.tsx:145`, `src/features/admin/components/AdminSessionsSection.tsx:57`, `src/features/dashboard/pages/DashboardPage.tsx:859`
- **Severity**: High
- **Category**: Accessibility
- **Description**: `text-slate-500` is used for 11px-12px informational copy on dark token surfaces. Measured contrast is about **4.04:1** on `#0b0f14` and drops to about **3.29:1** on `#1b2430`, below the 4.5:1 AA requirement for normal text.
- **Impact**: Low-vision users and users in bright environments will struggle to read metadata, timestamps, labels, and supporting metrics.
- **WCAG/Standard**: WCAG 2.2 - 1.4.3 Contrast (Minimum)
- **Recommendation**: Promote these labels to a higher-contrast token, especially for text below 14px or condensed uppercase metadata.
- **Suggested command**: `/normalize`

#### 5) Interactive tab patterns are not exposed as tabs
- **Location**: `src/features/routines/pages/RoutinesPage.tsx:156`, `src/features/routines/pages/RoutinesPage.tsx:166`, `src/features/routines/components/ExerciseSelector.tsx:281`, `src/features/routines/components/ExerciseSelector.tsx:294`
- **Severity**: High
- **Category**: Accessibility
- **Description**: The UI presents segmented tab controls for routine views and exercise creation modes, but they are plain buttons without `tablist`, `tab`, `aria-selected`, or panel relationships.
- **Impact**: Assistive tech does not announce current state or the relationship between the switcher and the content area.
- **WCAG/Standard**: WCAG 2.2 - 1.3.1 Info and Relationships, 4.1.2 Name, Role, Value
- **Recommendation**: Convert these to an actual tabs pattern or simplify them into clearly labeled toggle buttons with explicit state announcements.
- **Suggested command**: `/harden`

### Medium-Severity Issues

#### 6) Calendar relies on visual color and tooltips instead of semantic structure
- **Location**: `src/features/dashboard/components/WorkoutCalendar.tsx:130`, `src/features/dashboard/components/WorkoutCalendar.tsx:146`, `src/features/dashboard/components/WorkoutCalendar.tsx:175`, `src/features/dashboard/components/WorkoutCalendar.tsx:195`
- **Severity**: Medium
- **Category**: Accessibility
- **Description**: The calendar is a grid of generic elements, not a semantic table/grid. Workout details are hidden in colored dots and `title` attributes.
- **Impact**: Screen reader users do not get weekday context, and non-visual users miss muscle-group detail encoded by color alone.
- **WCAG/Standard**: WCAG 2.2 - 1.3.1 Info and Relationships, 1.4.1 Use of Color
- **Recommendation**: Expose weekday/day relationships semantically and include workout summaries in accessible names or supplementary text.
- **Suggested command**: `/harden`

#### 7) Missing `main` landmark on some top-level screens
- **Location**: `src/features/auth/pages/LoginPage.tsx:55`, `src/features/routines/pages/RoutinesPage.tsx:137`, `src/app/App.tsx:79`
- **Severity**: Medium
- **Category**: Accessibility
- **Description**: Login, routines, and the SSO callback view render top-level content in generic containers rather than a primary `<main>` landmark.
- **Impact**: Screen reader and keyboard users lose fast landmark navigation on major screens.
- **WCAG/Standard**: WCAG 2.2 - 1.3.1 Info and Relationships, 2.4.1 Bypass Blocks
- **Recommendation**: Wrap each primary page body in a single `<main>` landmark and keep header/nav outside it.
- **Suggested command**: `/harden`

#### 8) Theme is hard-locked to dark across CSS, browser chrome, and PWA manifest
- **Location**: `src/index.css:8`, `src/index.css:22`, `src/mobile-optimizations.css:55`, `index.html:14`, `index.html:29`, `vite.config.ts:18`
- **Severity**: Medium
- **Category**: Theming
- **Description**: The app sets `color-scheme: dark`, dark-only body defaults, dark meta theme colors, and dark manifest colors in multiple places.
- **Impact**: Future theme switching is expensive, UA controls are forced dark, and theming logic is duplicated across layers.
- **WCAG/Standard**: Design-system resilience / theming best practice
- **Recommendation**: Centralize theme tokens and browser-chrome values behind a single theme contract instead of hard-coding dark assumptions.
- **Suggested command**: `/normalize`

#### 9) Hard-coded palette bypasses the token system
- **Location**: `src/features/dashboard/lib/muscleGroups.ts:5`, `src/features/dashboard/components/ExerciseProgressPanel.tsx:254`, `src/features/dashboard/pages/DashboardPage.tsx:832`, `src/shared/ui/Toast.tsx:24`, `src/features/routines/components/RoutineCard.tsx:113`
- **Severity**: Medium
- **Category**: Theming
- **Description**: Shared surfaces mostly use the tokenized palette, but dashboard/admin visuals still inject raw hex values, inline colors, and one-off gradients.
- **Impact**: Visual drift is already visible and future theming work will require component-by-component overrides instead of token updates.
- **WCAG/Standard**: Design-system consistency
- **Recommendation**: Move muscle-group colors, state colors, and chart colors into named tokens or a documented semantic palette.
- **Suggested command**: `/normalize`

#### 10) Broad compositing hacks and fixed-page gradients add avoidable rendering cost
- **Location**: `src/mobile-optimizations.css:45`, `src/index.css:23`, `src/index.css:27`, `src/app/navigation/Navigation.tsx:67`
- **Severity**: Medium
- **Category**: Performance
- **Description**: Transition utility classes globally force `backface-visibility` and `perspective`, while the body uses large radial gradients with `background-attachment: fixed` and some persistent surfaces add blur.
- **Impact**: This increases GPU/compositing work and repaint cost, especially on mobile devices, for mostly decorative effects.
- **WCAG/Standard**: Performance best practice
- **Recommendation**: Remove global compositing hacks, keep expensive effects scoped to proven hotspots, and avoid fixed decorative backgrounds on scrolling app shells.
- **Suggested command**: `/optimize`

#### 11) Repeated render-time work will scale poorly with data growth
- **Location**: `src/features/workouts/hooks/useTimer.ts:261`, `src/features/workouts/components/ActiveWorkout.tsx:110`, `src/features/dashboard/components/MuscleGroupDashboard.tsx:27`, `src/features/admin/components/AdminUsersSection.tsx:66`
- **Severity**: Medium
- **Category**: Performance
- **Description**: The rest timer updates every 250ms even though the UI is second-based, workout progress deduping stringifies all logs on change, and some sections repeatedly filter large datasets inside render paths.
- **Impact**: Battery use and interaction cost will climb as workout history, routines, and logs grow.
- **WCAG/Standard**: Performance best practice
- **Recommendation**: Reduce timer frequency to once per second, replace whole-tree stringify comparisons with stable signatures or diff keys, and memoize grouped data.
- **Suggested command**: `/optimize`

#### 12) Responsive rigidity in admin layouts and fixed controls
- **Location**: `src/features/admin/components/AdminUsersSection.tsx:92`, `src/features/admin/components/AdminUsersSection.tsx:125`, `src/features/admin/components/AdminSessionsSection.tsx:59`, `src/features/admin/components/AdminRoutinesSection.tsx:37`, `src/features/workouts/components/Timer.tsx:96`
- **Severity**: Medium
- **Category**: Responsive
- **Description**: Several summary blocks require `sm:min-w-[220px]` to `xl:min-w-[520px]`, and the timer action uses `min-w-[120px]` inside a very compact shell.
- **Impact**: Small tablets, zoomed text, and translated copy are more likely to trigger cramped layouts or horizontal pressure.
- **WCAG/Standard**: WCAG 2.2 - 1.4.10 Reflow, responsive best practice
- **Recommendation**: Replace fixed minimums with stacking behavior, intrinsic sizing, or container-driven layouts.
- **Suggested command**: `/adapt`

#### 13) Error/success messaging is not announced in the custom exercise flow
- **Location**: `src/features/routines/components/ExerciseSelectorForm.tsx:72`, `src/features/routines/components/ExerciseSelectorForm.tsx:76`
- **Severity**: Medium
- **Category**: Accessibility
- **Description**: Validation and success messages render as plain divs without `role="alert"`, `role="status"`, or `aria-live`.
- **Impact**: Screen reader users may not know the form failed or succeeded after submission.
- **WCAG/Standard**: WCAG 2.2 - 3.3.1 Error Identification, 4.1.3 Status Messages
- **Recommendation**: Announce error and success states via live regions and connect field-level errors with `aria-describedby` where relevant.
- **Suggested command**: `/harden`

### Low-Severity Issues

#### 14) Metric-card sameness weakens hierarchy and reads as template-generated UI
- **Location**: `src/features/dashboard/pages/DashboardPage.tsx:571`, `src/features/dashboard/pages/DashboardPage.tsx:636`, `src/features/admin/components/AdminSummaryCards.tsx:8`, `src/features/admin/components/AdminControlPanel.tsx:91`
- **Severity**: Low
- **Category**: Anti-Patterns
- **Description**: Key information is repeated in interchangeable cards with similar size, tone, and rhythm.
- **Impact**: The interface feels flatter and more AI-generated, making it harder to tell what matters most.
- **WCAG/Standard**: UX hierarchy / frontend-design anti-patterns
- **Recommendation**: Collapse low-value metrics, create one or two true headline moments, and demote supporting stats.
- **Suggested command**: `/distill`

#### 15) Visual language drifts between tokenized solidity and blur-heavy glass surfaces
- **Location**: `src/app/navigation/Navigation.tsx:67`, `src/shared/ui/Toast.tsx:35`, `src/shared/ui/ConfirmModal.tsx:85`, `src/features/dashboard/components/ExerciseProgressPanel.tsx:281`
- **Severity**: Low
- **Category**: Anti-Patterns
- **Description**: Navigation, toasts, modals, and dashboard highlights mix blur/glass effects with otherwise solid, dense surfaces.
- **Impact**: The product feels less intentional and slightly more expensive to render.
- **WCAG/Standard**: Frontend-design anti-patterns / consistency
- **Recommendation**: Pick a clearer surface language and reserve blur for one deliberate layer, not several unrelated ones.
- **Suggested command**: `/quieter`

#### 16) Explanatory copy often repeats what the UI already communicates
- **Location**: `src/features/dashboard/components/ExerciseProgressPanel.tsx:267`, `src/features/dashboard/components/ExerciseProgressPanel.tsx:399`, `src/features/dashboard/components/ExerciseProgressPanel.tsx:525`, `src/features/dashboard/components/ExerciseProgressPanel.tsx:579`
- **Severity**: Low
- **Category**: Anti-Patterns
- **Description**: Several labels explain obvious chart behavior or restate visible state.
- **Impact**: Adds reading friction and contributes to an AI-slop tone.
- **WCAG/Standard**: UX clarity
- **Recommendation**: Cut explanatory filler and keep only copy that changes decisions or helps first-time use.
- **Suggested command**: `/clarify`

#### 17) Persistent pulse animation in bottom navigation is noisy
- **Location**: `src/app/navigation/Navigation.tsx:88`
- **Severity**: Low
- **Category**: Performance
- **Description**: The active workout action uses `animate-pulse` inside persistent navigation.
- **Impact**: Constant motion in app chrome can distract users and adds low-value animation overhead.
- **WCAG/Standard**: Motion restraint / frontend-design anti-patterns
- **Recommendation**: Replace perpetual motion with a calmer state treatment or a one-time entrance cue.
- **Suggested command**: `/quieter`

## Patterns & Systemic Issues

- Hard-coded colors and gradients appear in **40+ matches** outside the core token palette; the drift is concentrated in dashboard/admin visualization surfaces
- Low-contrast `text-slate-500` appears in **20 matches** on dark surfaces and is especially risky in 11px-12px metadata
- Unlabeled selects and pseudo-tabs repeat across routines and admin flows instead of using one hardened form/control pattern
- Admin and dashboard information architecture overuses equal-weight cards, which makes important signals compete with secondary metrics
- Modal accessibility is good at the utility level, but modal stacking is not designed as a system

## Positive Findings

- The project already has a real design-system base with reusable tokens and component utilities: `tailwind.config.js:6`, `tailwind.config.js:10`, `src/index.css:49`, `src/index.css:78`, `src/index.css:118`
- Typography is more intentional than boilerplate app UI: `index.html:19`, `src/index.css:21`, `src/index.css:39`
- Reduced-motion support exists for major custom animations: `src/index.css:303`
- Dialog focus management and toast announcements are mostly solid foundations: `src/shared/hooks/useDialogA11y.ts:32`, `src/shared/ui/Toast.tsx:36`, `src/shared/ui/ConfirmModal.tsx:91`
- Code-splitting is already in place for major route-level work: `src/app/App.tsx:11`, `src/app/App.tsx:17`, `src/features/dashboard/pages/DashboardPage.tsx:793`
- Image usage is limited and the two avatar images do include alt text: `src/features/dashboard/components/MuscleGroupDashboard.tsx:104`, `src/features/routines/components/RoutineCard.tsx:61`

## Recommendations by Priority

### Immediate
- Fix missing labels, icon button names, live status messaging, and modal stacking
- Raise low-contrast metadata text to AA-compliant tokens
- Make tab controls and the workout calendar semantically accessible

### Short-Term
- Normalize color usage so charts, muscle groups, toasts, and switches all use documented semantic tokens
- Remove global compositing hacks and reduce always-on blur/fixed background cost
- Replace fixed-width admin summary blocks with layouts that reflow cleanly under zoom and narrow widths

### Medium-Term
- Reduce render churn in timer/workout/admin grouping paths
- Simplify dashboard/admin metric hierarchy so primary insights are visually dominant
- Audit the dark-theme contract and centralize browser-chrome theming values

### Long-Term
- Build a reusable segmented-control/tabs pattern and a reusable labeled form-field wrapper
- Create a documented data-viz palette for charts and muscle groups
- Run a second audit after remediation to verify contrast, semantics, and motion quality

## Suggested Commands for Fixes

- Use `/harden` to address **7 accessibility issues**: labels, icon-button names, modal stacking, tabs semantics, calendar semantics, landmarks, and live status messages
- Use `/normalize` to address **3 theming issues**: token bypass, dark-mode contract sprawl, and low-contrast text token selection
- Use `/optimize` to address **3 performance issues**: global compositing hacks, fixed decorative paints, timer/stringify/render-time hotspots
- Use `/adapt` to address **1 responsive issue**: admin min-width constraints and compact-control pressure
- Use `/distill` to address **1 hierarchy issue**: metric-card sameness and over-distributed emphasis
- Use `/quieter` to address **2 visual-noise issues**: blur/glass drift and perpetual pulse motion
- Use `/clarify` to address **1 copy issue**: redundant explanatory text in progress/history surfaces
- Use `/critique` after fixes for a final visual and UX review pass
