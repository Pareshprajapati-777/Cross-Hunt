# Cross Hunt Ship Booking — Design System

**Version**: 2.0 (Phase 2 — Impeccable Spatial Refinement)  
**Last Updated**: 2026-10-13  
**Purpose**: Maritime luxury booking platform with trust-focused institutional design

---

## Visual Theme

**Atmosphere**: Coastal elegance meets data clarity — premium maritime experience with transparent pricing  
**Density**: Medium (information-rich but breathable, 60% viewport utilization)  
**Philosophy**: Impeccable spatial design with purposeful spacing, refined glows, and nautical semantics

---

## Color Palette

### Ocean Blues (Signal Accent)
Primary actions, CTAs, and trust indicators use ocean blue exclusively:

- **Primary**: `#0284c7` (sky-600) — Primary CTAs, links, active states
- **Hover**: `#0369a1` (sky-700) — Hover states on primary actions
- **Light**: `#e0f2fe` (sky-100) — Subtle section backgrounds
- **Glow**: `#38bdf8` (sky-400) — Trust badge halos, highlights
- **Deep**: `#075985` (sky-800) — Dark ocean depths in gradients

### Neutrals (Always Tinted with Blue)
**NO pure black (#000000) or pure gray (#666666) — Impeccable rule**

- **Slate-950**: `#020617` (deepest surfaces, tinted with blue)
- **Slate-900**: `#0f172a` (dark hero overlays, card text)
- **Slate-800**: `#1e293b` (secondary text)
- **Slate-700**: `#334155` (tertiary text)
- **Slate-500**: `#64748b` (muted text)
- **Slate-200**: `#e2e8f0` (borders)
- **Slate-100**: `#f1f5f9` (subtle backgrounds)
- **Slate-50**: `#f8fafc` (page background — barely tinted)

### Semantic Colors

- **Success**: `#10b981` (emerald-500) — Verified badges, available status
- **Warning**: `#f59e0b` (amber-500) — Exclusive packages, premium features
- **Error**: `#ef4444` (red-500) — Cancelled bookings, errors
- **Info**: `#38bdf8` (sky-400) — Informational badges

---

## Typography

### Display Typography (Headlines)
```css
font-family: 'Playfair Display', serif
font-size: 48px → 60px → 84px (mobile → tablet → desktop)
font-weight: 700-900 (bold to black)
line-height: 1.06 (tight, editorial)
letter-spacing: -0.02em (optical correction)
color: white (hero) / slate-900 (sections)
```

**Usage**: Hero headlines, section titles, dramatic announcements

### Body Typography (Descriptions)
```css
font-family: 'Plus Jakarta Sans', 'Outfit', sans-serif
font-size: 14px → 15px → 16px (mobile → tablet → desktop)
font-weight: 400-500 (regular to medium)
line-height: 1.7 (relaxed, readable)
color: slate-600 / white/85 (on dark)
```

**Usage**: Body copy, descriptions, secondary information

### Monospace Typography (Data — NEW in Phase 2)
```css
font-family: 'JetBrains Mono', ui-monospace, monospace
font-feature-settings: 'tnum' (tabular numbers)
font-variant-numeric: tabular-nums
font-size: 12px-24px (depending on context)
font-weight: 500-700
color: slate-900 / sky-800 (prices)
```

**Usage**: Prices, departure times, booking IDs, durations, capacities  
**Why**: Monospace prevents layout shifts when numbers change, looks technical/precise  
**Examples**: `₹12,450`, `14:30`, `3 Days`, `30 – 350 guests`

---

## Component Patterns

### Trust Badges (Phase 2 Refined)
**Size**: 44px × 44px icon (Impeccable touch target minimum)  
**Gaps**: 24px (mobile) → 32px (desktop) — purposeful, not generic 20px  
**Background**: Radial gradient (sky-500 → sky-600 → sky-800)  
**Border**: 2px solid rgba(255,255,255,0.9)  
**Shadow**: Soft halo, NO dark glows on light backgrounds (Impeccable rule)

```css
boxShadow: 
  0 0 0 3px rgba(56,189,248,0.35),     /* Soft blue halo */
  0 8px 28px rgba(56,189,248,0.22),    /* Diffused glow */
  inset 0 1px 3px rgba(255,255,255,0.45) /* Specular highlight */
```

**Animation**: Continuous pulse (scale 1.0 → 1.08, 2.4s easeInOutQuad loop)

### Search Widget (Glassmorphic)
**Style**: Glassmorphic white card with backdrop blur  
**Backdrop**: blur(24px) + saturate(180%)  
**Border**: 1px rgba(255,255,255,0.85)  
**Shadow**: Multi-layer (ambient + depth)

```css
box-shadow:
  0 4px 6px rgba(0,0,0,0.03),
  0 16px 36px rgba(2,132,199,0.06),
  inset 0 1px 0 rgba(255,255,255,0.9)
```

**Input Height**: 48px (12px text, comfortable touch)  
**Padding**: 24px (not 20px — purposeful)

### Ship/Tour Cards
**Background**: White (not gray — Impeccable rule)  
**Border**: 1px slate-200, hover → sky-300  
**Radius**: 24px (rounded-3xl)  
**Hover**: translateY(-4px) + shadow increase  
**Image Aspect**: 16:10 (ships/tours), 4:3 (events)  
**Padding**: 20px (internal content)

---

## Layout Principles

### Spacing Scale (8px Base Grid)
Following Impeccable — purposeful, not generic Tailwind defaults:

- `xs`: 8px (tight grouping)
- `sm`: 12px (related items)
- `md`: 20px (component internal)
- `lg`: 24px (section internal) ← **Not 20px!**
- `xl`: 32px (between major groups) ← **Not 28px!**
- `2xl`: 48px (section padding)
- `3xl`: 80px (hero/footer spacing)

**Avoid**: 16px, 28px, 40px (generic defaults)  
**Use**: 12px, 20px, 24px, 32px, 48px (purposeful)

### Container & Grid
- **Max Width**: 1360px (wide content), 1024px (text-focused)
- **Columns**: 12-column grid (1fr repeat)
- **Gap**: 32px (desktop), 20px (mobile)
- **Padding**: 16px (mobile), 24px (tablet), 40px (desktop)

---

## Depth / Elevation

### Shadow System (Never Pure Black)
All shadows use ocean-tinted rgba(2,132,199,x):

```css
--shadow-sm:  0 1px 3px rgba(2,132,199,0.05)
--shadow-md:  0 4px 12px rgba(2,132,199,0.08)
--shadow-lg:  0 10px 25px rgba(2,132,199,0.1)
--shadow-xl:  0 25px 50px rgba(2,132,199,0.12)
```

### Surface Hierarchy
1. **Page Background**: slate-50 (barely tinted)
2. **Cards**: white + shadow-md
3. **Elevated Cards**: white + shadow-lg + hover lift
4. **Overlays**: slate-900/80 + backdrop-blur(24px)

---

## Maritime-Specific Patterns

### Monospace Data Display
**Always use `font-mono-numbers` class for**:
- Prices: `₹12,450 / adult`
- Dates: `2026-10-15`
- Times: `14:30 IST`
- Durations: `3 Days 2 Nights`
- Capacities: `30 – 350 guests`
- Booking IDs: `#BK-20261013-4782`

### Trust Indicators
- **Verified Operators**: Green emerald badge with ShieldCheck icon
- **Licensed Ships**: Blue sky badge with Anchor icon  
- **Safe Ports**: Green badge with Navigation icon
- **Best Price**: Sky badge with Tag icon

### Color Semantics
- **Ocean Blue** (#0284c7): Primary signal — trust, action, navigation
- **Emerald Green** (#10b981): Safety, verification, success
- **Amber Gold** (#f59e0b): Premium, exclusive, milestone events
- **Slate Gray** (tinted): Neutral surfaces, never pure gray

---

## Do's and Don'ts

### ✅ DO
- Use ocean blue (#0284c7) for **ALL** primary CTAs
- Tint all grays with blue undertone (never pure gray)
- Add breathing room: 24px+ padding on cards
- Use `font-mono-numbers` for all numerical data
- Stagger animations (anime.js 120ms delay between badges)
- Full-bleed ship photography with gradient overlays
- 44px minimum touch targets (Impeccable rule)
- Multi-layer gradients for atmospheric depth

### ❌ DON'T
- **NO** pure black (#000) or pure gray (#666)
- **NO** nested cards (card inside card)
- **NO** bounce/elastic easing (use easeOutExpo, easeInOutQuad)
- **NO** purple-blue gradients (cliché)
- **NO** side-tab borders (dated pattern)
- **NO** dark glows on light backgrounds (Impeccable violation)
- **NO** Inter font (use Plus Jakarta Sans or Outfit)
- **NO** generic 20px/16px spacing (use purposeful 24px/32px)

---

## Responsive Breakpoints

```css
/* Mobile First */
mobile:    0-767px   (base styles)
tablet:    768-1023px  (md:)
desktop:   1024-1439px (lg:)
wide:      1440px+     (xl:, 2xl:)
```

---

## Accessibility (WCAG AA)

### Contrast Ratios
- **Normal text**: 4.5:1 minimum
- **Large text (18px+)**: 3:1 minimum
- **Interactive elements**: 3:1 against adjacent colors

### Touch Targets
- **Minimum**: 44px × 44px (Impeccable rule)
- **Comfortable**: 48px × 48px (search inputs, primary buttons)

### Keyboard Navigation
- All interactive elements must be keyboard-accessible
- Focus visible: 2px sky-500 outline with 2px offset
- Tab order follows visual hierarchy

### Screen Readers
- All icons have `aria-label` or adjacent text
- Images have descriptive `alt` text
- Form inputs have associated `<label>`

---

## Animation Guidelines (Phase 1 + Phase 2)

### Easing Functions (No Bounce/Elastic)
- **Entrances**: `easeOutExpo`, `easeOutCubic`
- **Exits**: `easeInCubic`
- **Loops**: `easeInOutQuad`, `easeInOutSine`
- **Hover**: `cubic-bezier(0.34, 1.56, 0.64, 1)` (gentle overshoot OK)

### Duration Guidelines
- **Fast**: 150-250ms (hovers, toggles)
- **Normal**: 300-500ms (page transitions, reveals)
- **Slow**: 800-1200ms (hero entrances)
- **Loops**: 2400-3000ms (ambient pulses, floats)

### Hardware-Accelerated Properties
✅ Use: `opacity`, `transform` (translate, scale, rotate)  
❌ Avoid: `width`, `height`, `top`, `left`, `margin`

---

## Browser Support

- **Chrome/Edge**: 90+ (Chromium)
- **Firefox**: 88+
- **Safari**: 14+ (WebKit)
- **Mobile**: iOS 14+, Android 10+

---

## Design Tools

- **Color Picker**: https://uicolors.app/create
- **Shadows**: https://shadows.brumm.af
- **Typography**: https://typ.io
- **Spacing**: https://spacing.app
- **Impeccable CLI**: `npx impeccable detect` (static analysis)

---

## Version History

**v2.0** (2026-10-13) — Phase 2: Impeccable Spatial Refinement
- Refined trust badge glows (softer halos, no dark glows)
- Added `font-mono-numbers` class for all data
- Increased hero headline to text-7xl (84px desktop)
- Updated spacing to purposeful 24px/32px (not generic 20px)
- Multi-layer atmospheric gradients on hero
- 44px touch target enforcement
- Fixed trust badges container opacity issue

**v1.0** (2026-10-12) — Phase 1: Anime.js Foundation
- Implemented entrance animations with anime.js
- Staggered trust badge reveals (120ms delay)
- Continuous pulse on badge icons (2.4s loop)
- Floating "Watch Video" button
- Slide-up search form

**v0.1** (Initial) — Base Implementation
- Bootstrap 5 → Tailwind CSS 4 migration
- Three.js ocean scene integration
- Spatial card system from Impeccable

---

**Design Philosophy**: "Maritime luxury with institutional trust — every pixel purposeful, every number precise."
