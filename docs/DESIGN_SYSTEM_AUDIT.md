# GrizCam Analytics — Design System Audit

> Audit date: 2026-05-27
> Branch: `feature/synthetic-image-gen` (audit conducted here; redesign work intended on a separate branch)
> Source of truth for target design system: [`Grizzly-Systems-dev/grizcam_design_docs`](https://github.com/Grizzly-Systems-dev/grizcam_design_docs)

## Purpose

Catalog the gap between the **current analytics dashboard** (`apps/web`) and the **Grizzly Systems design system** (per `grizcam_design_docs/BRAND.md`, `grizcam_design_docs/DESIGN.md`, and `grizcam_design_docs/tokens/*.css`). Output is a prioritized punch list for whoever picks up the redesign.

## Target system at a glance

- **Five colors only**: pitch-black `#1a1812`, taupe `#454039`, bone `#e8e2d2`, floral-white `#f9f7f0`, goldenrod `#d99e30`.
- **Three fonts**: Inter Tight (UI/display), Source Serif Pro (long-form body), JetBrains Mono (telemetry: coordinates, timestamps, IDs).
- **Light is default**, dark is contextual (`data-theme="dark"`).
- **No shadows, no gradients, no emoji, no exclamation points, no marketing intensifiers.**
- **Goldenrod rationed**: once per view. Two goldenrod elements on a screen = one of them is wrong.
- **4px spacing scale**: `4/8/12/16/20/24/32/40/48/64`.
- **Borders are first-class structure**: 1px default, 1.5px on focused inputs, 3px on callout left edges. No other border widths.
- **Radius scale**: `4/6/8/12/9999`. Buttons + inputs are 6px, cards are 8px, pills (status + filter chips only) are 9999.
- **Motion**: 120ms ease, opacity + transform only. No color animation.
- **Voice**: "field-radio terse". UI labels are `UPPERCASE TRACKED`. Body is sentence case. Telemetry is mono numerals.

## Severity buckets

### 🔴 Critical — fundamentals; visible on every screen

| Dimension | Current state | Target state | Fix locus |
|---|---|---|---|
| **Color palette** | Cold dark gray (`--bg #111`, `--accent #d4d4d8`); no goldenrod anywhere | Five-color brand palette per [`tokens/grizzly-systems-theme.css`](https://github.com/Grizzly-Systems-dev/grizcam_design_docs/blob/main/tokens/grizzly-systems-theme.css) | `apps/web/src/styles.css`, plus removing hardcoded Tailwind color classes throughout |
| **Theme mode** | Hard-coded dark (`color-scheme: dark` in `:root`); `text-zinc-100`/`bg-neutral-900` baked into AppShell | Light default; dark via `data-theme="dark"` on `<html>`. Token swap should propagate automatically. | `apps/web/src/styles.css:4`, then audit all `text-zinc-*`/`bg-neutral-*`/`border-white/*` Tailwind utility usage |
| **Typography** | Avenir Next single family | Inter Tight + Source Serif Pro + JetBrains Mono. Inter Tight 500 default; tracked -0.02em at display sizes. Mono only for telemetry. Body Source Serif Pro. | `apps/web/src/styles.css:16` font-family; add `@font-face` imports from Google Fonts; component-level family overrides for body and telemetry contexts |
| **Goldenrod accent** | Doesn't exist in the UI | The single accent. Used on the primary CTA per view, focused inputs, single alert state. **Once per view.** | New addition — must be deliberately placed, not sprinkled |

### 🟡 High impact — touches every screen, concentrated fix locations

| Issue | Affected files | Fix |
|---|---|---|
| Chart palettes use gray-shade ramps that violate the 5-color rule | [`CompositionChart.tsx:6`](apps/web/src/components/charts/CompositionChart.tsx:6), [`DailyTrendChart.tsx:22`](apps/web/src/components/charts/DailyTrendChart.tsx:22), [`TimeOfDayChart.tsx:15-18`](apps/web/src/components/charts/TimeOfDayChart.tsx:15), [`MonthlyActivityByCategoryChart.tsx`](apps/web/src/components/charts/MonthlyActivityByCategoryChart.tsx), [`Heatmap.tsx`](apps/web/src/components/charts/Heatmap.tsx), [`DayDetailPanel.tsx:36`](apps/web/src/components/DayDetailPanel.tsx:36) | Centralize a 5-color chart palette in `lib/chartColors.ts`. Replace inline hex literals. Multi-series charts that exceed the palette must distinguish via tone/weight or text labels, not extra colors. |
| Card radius `rounded-3xl` (24px) violates the 8px card rule | [`SectionCard.tsx:12`](apps/web/src/components/SectionCard.tsx:12), [`KpiStrip.tsx:5`](apps/web/src/components/KpiStrip.tsx:5), [`AppShell.tsx:51`](apps/web/src/components/AppShell.tsx:51) header, nav pills throughout AppShell | Change to `rounded-lg` (8px) on cards; nav pill chips can stay 9999 (pill is allowed); buttons/inputs → 6px |
| Border styling uses `border-white/10` rgba | All panel components, AppShell | Single token `--border` mapped to bone `#e8e2d2` in light, taupe `#454039` in dark. 1px default everywhere. |
| `Tooltip contentStyle` hardcoded `#202020` + rgba border | All 5 chart files | Use CSS vars + tokenized colors |

### 🟢 Polish — discrete fixes

| Issue | Location | Fix |
|---|---|---|
| Hardcoded box-shadow (system forbids shadows) | [`QueryPage.tsx:881`](apps/web/src/pages/QueryPage.tsx:881) `shadow-[0_-12px_32px_rgba(2,6,23,0.22)]` | Replace with 1px border on a slightly different surface |
| `<linearGradient id="activity-fill">` (system forbids gradients) | [`DailyTrendChart.tsx:31`](apps/web/src/components/charts/DailyTrendChart.tsx:31) | Replace with flat fill at fixed opacity |
| Default Tailwind `transition` animates colors | [`AppShell.tsx:71`](apps/web/src/components/AppShell.tsx:71) NavLink, others | Constrain to `transition-[opacity,transform] duration-[120ms] ease` |
| Marketing softening in copy | `DashboardPage` subtitle: *"Classic wildlife and activity dashboard, focused on the **familiar** analytics views."* | Field-radio terse: *"Wildlife and activity dashboard."* |
| Date-picker indicator hack (`filter: invert(1)`) assumes dark | [`styles.css:60`](apps/web/src/styles.css:60) | Becomes unnecessary in light default |
| No icon library | Project-wide | Add Lucide via CDN or `lucide-react` package; 1.5px stroke, 24px canonical size, inherit `currentColor` |

## Page-by-page complexity

| Page | LOC | Redesign complexity | Notes |
|---|---|---|---|
| [`QueryPage.tsx`](apps/web/src/pages/QueryPage.tsx) | 1,958 | High | SQL workspace; rich interactions. Largest single file. Best left for a separate dedicated pass. |
| [`ReportsPage.tsx`](apps/web/src/pages/ReportsPage.tsx) | 504 | Medium | Long-form generated text. Best showcase for Source Serif Pro body type. |
| [`AdvancedPage.tsx`](apps/web/src/pages/AdvancedPage.tsx) | 264 | Medium | Analytics Lab — anomaly, forecasting, data quality |
| [`OpsPage.tsx`](apps/web/src/pages/OpsPage.tsx) | 211 | Medium | Operational/status surface. Natural fit for goldenrod alerts. |
| [`DashboardPage.tsx`](apps/web/src/pages/DashboardPage.tsx) | 188 | **Low** | Overview KPIs + multi-chart layout + table + aside. Smallest, most-seen, exercises the most design-system surfaces. **Strong hero candidate.** |

## Scope tiers and effort

| Tier | Scope | Effort | Outcome |
|---|---|---|---|
| **T1** | 🔴 Critical only | ~1 day | Tokens ported, fonts loaded, light default, palette swapped globally. Whole app looks new-brand without component rewrites. |
| **T2** | 🔴 + 🟡 globally | ~2 days | T1 + chart palette unified, card radii fixed, border discipline. Brand-coherent across all screens. |
| **T3** | T2 + 🟢 polish | ~2.5 days | T2 + shadow/gradient/motion fixes + copy audit + icons. The dashboard is design-system-compliant globally. |
| **T4** | T3 + one hero screen pixel-faithful to spec | ~4–5 days | T3 + DashboardPage rewritten to match the `.grz-card` / KPI / button / focus-ring patterns in `reference/grizcam-portal-*` kits. Reference implementation for whoever continues. |
| **T5** | T4 + second hero screen | ~6–7 days | T4 + ReportsPage or OpsPage to spec. Probably overruns wrap timeline. |

## Recommendation

**T4 (Critical + High + Polish globally, DashboardPage as hero).** Fits the ~1-week wrap-up window with buffer for handoff doc and demo recording. Produces a globally coherent rebrand plus one screen that demonstrates the design-system patterns in code.

If T4 runs long, T3 alone is still a strong handoff deliverable — the next person inherits a tokenized codebase rather than one full of hardcoded colors.

## Implementation order (recommended)

1. **Port tokens** — copy `grizzly-systems-theme.css` + `colors_and_type.css` into `apps/web/src/styles/tokens/`; import from `styles.css`.
2. **Swap fonts** — add `@font-face` for Inter Tight, Source Serif 4 (Source Serif Pro fallback), JetBrains Mono. Set `font-family` per-context (UI = Inter Tight, body = serif, telemetry = mono).
3. **Light-default** — remove `color-scheme: dark`; set tokens so light tokens apply at `:root` and dark tokens at `[data-theme="dark"]`.
4. **Replace `--bg`/`--text`/`--accent`** in [`styles.css`](apps/web/src/styles.css) with mappings to brand tokens (`--fg1`/`--bg1`/`--accent` from the system).
5. **AppShell** — change `bg-neutral-900` → `bg-surface-raised` token; nav border/text classes → token vars.
6. **Chart palette** — extract to `lib/chartColors.ts`; refactor each chart file to import.
7. **Radius pass** — `rounded-3xl` → `rounded-lg` for cards globally.
8. **Shadow + gradient kill** — fix the two offending lines.
9. **Motion** — global override for transitions.
10. **Copy audit** — pass through page subtitles, button labels, empty-state copy, error messages.
11. **Icons** — install Lucide; replace any inline SVG hacks.
12. **Hero screen** — DashboardPage: rebuild SectionCard as `.grz-card` pattern, KpiStrip with eyebrow labels (mono prefix + tracked uppercase), button styles, focus rings, table row borders.

## Open questions for the brand owner

Surfacing per `grizcam_design_docs/CLAUDE.md`:

- **Final icon library**: Lucide is the safe default but should be confirmed.
- **Source Serif Pro vs Source Serif 4**: licensed static vs Google's variable fallback.
- **Chart color extension**: the 5-color rule is strict but analytics inherently needs to distinguish many series. Options: tone variants of one color (1 hue × 5 lightness), or fall back to taupe/bone variants for non-primary series. Worth confirming with brand owner before locking the chart palette.
- **Photography**: design system flags this as "absent"; we have the synthetic-image-gen pipeline in this branch which could supply it — coordination needed.
- **Dark mode trigger for the analytics surface**: design system says dark is for live monitoring + operator opt-in. Analytics is closer to reporting/exploration — should it default light only, or expose a toggle?

## What this audit does **not** cover

- Accessibility (color contrast against the brand palette, focus-state visibility, screen reader landmarks) — separate pass needed.
- Mobile/responsive breakpoints — the design docs describe desktop chrome; mobile patterns aren't documented.
- Embed surface (`/embed/*` routes) — has its own `EmbedLayout`; needs separate audit.
- Performance/bundle-size impact of adding three font families.

---

*Generated as part of the contract wrap-up. Update when redesign work begins or design system evolves.*
