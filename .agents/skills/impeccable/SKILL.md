---
name: impeccable
description: "Design guidance for AI coding agents. Focuses on frontend craftsmanship, spatial UI depth, distinctive typography, rich data visual charts, and eliminating generic AI templates."
---

# Impeccable Design & Frontend Craftsmanship

This skill guides high-craft, distinctive, production-grade frontend design and spatial UI architecture.

## 1. Core Principles
- **Spatial UI & Tangible Depth**: Interfaces should feel tactile, layered, and physically grounded. Use multi-layer shadows (ambient occlusion + directional lighting), frosted glass surfaces (`backdrop-filter`), hairline borders, and subtle inner specular highlights (`inset 0 1px 0 rgba(255,255,255,0.15)`).
- **Curated Typography (Anti-Default)**: Never use boring system defaults or generic overused fonts without intent. Pair architectural serifs (*Playfair Display*, *Cinzel*) for regal headings with crisp, modern geometric sans (*Outfit*, *Plus Jakarta Sans*) for high-density UI, and monospace tabular fonts (*JetBrains Mono*) for financial figures and counts.
- **Data Visual Polish (Spatial Charts)**: Charts must not look like flat, raw HTML blocks. Use glowing linear gradients, rounded pill geometries, soft ambient drop shadows, high-precision hover tooltips, and legible legends.
- **Anti-Patterns & Bans**:
  - Never put gray text on colored backgrounds.
  - Never wrap everything in identical repetitive cards, and NEVER nest cards inside cards.
  - Never use pure pitch black `#000000` or raw gray `#808080`—always tint with atmospheric oceanic/slate hues.
  - Avoid bouncy or unmotivated animations; use intentional `150ms–250ms` cubic-bezier transitions.

## 2. Spatial UI Styling Specs
- **Hairline Specular Borders**: `border: 1px solid rgba(255, 255, 255, 0.12)` on dark, `border: 1px solid rgba(226, 232, 240, 0.8)` on light.
- **Frosted Glass Docks**: `backdrop-blur-xl bg-white/80 dark:bg-slate-900/80`.
- **Soft Ambient Shadows**: Layered shadows: `0 4px 6px -1px rgba(0,0,0,0.05), 0 12px 24px -4px rgba(14,165,233,0.08)`.
- **Tabular Figures**: Always apply `font-mono tabular-nums` or `font-feature-settings: "tnum"` to financial currencies and counts.
