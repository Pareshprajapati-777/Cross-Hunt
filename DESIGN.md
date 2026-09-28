# DESIGN.md — Cruise Hunt Design System & UX Standards

## 1. Visual Language & Philosophy
**Cinematic Ocean Luxury + Restrained Modernism.**
Cruise Hunt pairs deep maritime midnight tones with shimmering cyan refractions, warm starlight gold accents, and architectural typography. It completely avoids generic SaaS templates, loud multicolor gradients, and random decorative clutter.

---

## 2. Centralized Color Tokens

```css
:root {
  /* Deep Ocean Depths */
  --color-ocean-950: #030712;
  --color-ocean-900: #0a1128;
  --color-ocean-850: #0f1c3f;
  --color-ocean-800: #142850;
  --color-ocean-700: #1c3d73;
  --color-ocean-600: #25589c;

  /* Atmospheric Surfaces */
  --color-surface-dark: rgba(10, 17, 40, 0.85);
  --color-surface-glass: rgba(15, 28, 63, 0.65);
  --color-surface-border: rgba(255, 255, 255, 0.12);
  --color-surface-border-subtle: rgba(255, 255, 255, 0.06);

  /* Primary Light & Accents */
  --color-cyan-glow: #38bdf8;
  --color-cyan-hover: #0284c7;
  --color-gold-star: #fbbf24;
  --color-gold-glow: #f59e0b;
  --color-gold-muted: rgba(245, 158, 11, 0.15);

  /* Typography Colors */
  --color-text-pure: #ffffff;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;

  /* Status Colors */
  --color-status-pending: #f59e0b;
  --color-status-confirmed: #10b981;
  --color-status-completed: #38bdf8;
  --color-status-cancelled: #64748b;
  --color-status-rejected: #ef4444;
}
```

---

## 3. Typography Hierarchy
- **Display & Serifs**: *Cinzel* or *Playfair Display* for dramatic nautical headings and voyage names.
- **Modern UI & Body**: *Plus Jakarta Sans* or *Outfit* for crisp legibility across all data, tables, and forms.
- **Sizes**:
  - Hero Display: `clamp(2.5rem, 5vw, 4.5rem)`
  - Section Headings: `clamp(1.75rem, 3vw, 2.5rem)`
  - Card Titles: `1.25rem` / `700`
  - Body: `0.938rem` / `400`
  - Captions/Badges: `0.75rem` / `600` uppercase tracking

---

## 4. Liquid Glass & Surface Rules
- Used selectively on **high-value floating surfaces**:
  1. Top sticky Navigation bar
  2. Hero floating Search & Route filter dock
  3. Booking Summary drawer on checkout
  4. Authentication card panel
  5. Modal confirmation dialogs
- **Formula**: `backdrop-filter: blur(16px); background: rgba(15, 28, 63, 0.65); border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);`
- Always provides a solid fallback for browsers without backdrop-filter support.

---

## 5. Animation & Motion Discipline (Emil Kowalski Principles)
- **Timing & Transitions**:
  - Micro-interactions (hover, active press): `120ms` ease-out.
  - Dropdown & Tooltip reveals: `180ms` ease-out.
  - Page & View transitions: `250ms–350ms` cubic-bezier(0.16, 1, 0.3, 1).
  - Modal entrances: `200ms` scale(0.97 $\rightarrow$ 1) + opacity(0 $\rightarrow$ 1).
  - Large Hero 3D camera pan: slow cinematic drift `600ms–800ms`.
- **Reduced Motion**: All animations disable transform offsets when `@media (prefers-reduced-motion: reduce)` is triggered.

---

## 6. 3D WebGL (R3F) Usage Rules
- WebGL / Three.js is utilized where depth adds tangible understanding:
  1. **Hero Cruise Scene**: Atmospheric 3D ship vessel resting on calm ocean waters with subtle moonlight/sunlight reflections.
  2. **Interactive Route Globe**: Tactile 3D sphere showing destination ports.
- **Performance Constraints**:
  - Lazy load Three.js canvas; show low-poly or high-res visual skeleton during initialization.
  - Cap device pixel ratio (`dpr={[1, 1.5]}`) to ensure 60fps on mobile.
  - On viewports $< 768\text{px}$, provide high-performance CSS 2.5D visual alternative.

---

## 7. Responsive Breakpoints
- Mobile: `375px – 640px` (Single column, sticky bottom booking drawer)
- Tablet: `641px – 1024px` (Two column grid, consolidated filter drawer)
- Desktop: `1025px – 1440px` (Full floating glass docks, sidebar itinerary view)
- Ultrawide: `1441px+` (Max content container capped at `1400px` for optimal reading flow)
