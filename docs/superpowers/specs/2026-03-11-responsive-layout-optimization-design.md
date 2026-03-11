# Responsive Layout Optimization for Corporate-Classic Theme

**Date:** 2026-03-11
**Status:** Approved

## Goal

Optimize the corporate-classic theme for multi-resolution compatibility, especially 1920x1080 and other mainstream desktop resolutions. Improve visual quality across breakpoints without changing image original sizes or overall layout structure.

## Constraints

- No changes to image original dimensions
- No changes to layout structure (component arrangement, grid column logic)
- Only optimize spacing, widths, heights, and proportional values
- Keep existing mobile/tablet behavior intact

## Approach: Breakpoint Extension

Add `xl` (1280px) and `2xl` (1536px) Tailwind breakpoint values to existing components. This is consistent with the current Tailwind breakpoint pattern used throughout the codebase.

## Changes

### 1. Global Token & Container

**Files:** `frontend/src/theme/tokens.ts`, `frontend/tailwind.config.ts`, `frontend/src/index.css`

| Token | Current | New |
|-------|---------|-----|
| `layout.maxWidth` in `defaultTokens` | `1200px` | `1400px` |
| `--layout-max-width` (CSS var) | `1200px` | `1400px` |
| `maxWidth.layout` (tailwind config) | `1200px` | `1400px` |

**Theme packages:** `modern-dark` and `warm-earth` both define `layout.maxWidth: "1200px"`. These should also be updated to `1400px` to stay consistent.

**Content padding:** All section wrappers use `px-4 md:px-content` where `px-content` maps to `var(--layout-content-padding)` = `1.5rem` (24px). Add `xl:px-8` (32px) to every wrapper that uses this pattern. This is a manual per-file change (not a CSS variable change) to preserve the token-based system.

**Section vertical spacing:** Handled by `SectionWrapper` in `SectionRenderer.tsx` via `py-section` / `py-section-sm` / `py-section-lg` classes which map to CSS variables. Add responsive override in `index.css`:
```css
@media (min-width: 1280px) {
  :root {
    --layout-section-spacing: 6rem; /* 96px, up from 80px */
  }
}
```

### 2. HeroSection

**File:** `frontend/src/theme/sections/HeroSection.tsx`

Two height branches exist:

**Image branch:**
- Current: `h-[280px] sm:h-[360px] md:h-[440px] lg:h-[560px]`
- New: `min-h-[280px] sm:min-h-[360px] md:min-h-[40vh] lg:min-h-[45vh] max-h-[600px]`

**Color-background branch:**
- Current: `h-[200px] sm:h-[300px] md:h-[400px] lg:h-[500px]`
- New: `min-h-[200px] sm:min-h-[300px] md:min-h-[35vh] lg:min-h-[40vh] max-h-[540px]`

Hero title text:
- Current: `text-2xl md:text-3xl lg:text-4xl`
- Add: `xl:text-5xl`

Hero subtitle text:
- Current: `text-base sm:text-xl md:text-2xl lg:text-3xl`
- Unchanged at xl

### 3. CardGridSection

**File:** `frontend/src/theme/sections/CardGridSection.tsx`

Current state:
- Grid gap: `gap-0` (intentional for edge-to-edge card layout)
- Image sizing: `w-full h-full object-cover` with no explicit height classes
- Card title: `text-lg sm:text-xl md:text-2xl`

Changes:
- Grid gap: **unchanged** (`gap-0` is intentional for this design)
- Image sizing: **unchanged** (images fill their containers naturally)
- Card title: already at `md:text-2xl`, no change needed
- Content padding wrapper: add `xl:px-8`

### 4. TextImageSection

**File:** `frontend/src/theme/sections/TextImageSection.tsx`

Current state:
- Image container: `aspect-[4/3] max-h-[400px] lg:max-h-none`
- At lg+ the max-height is already removed

Changes:
- **No changes to image sizing** — `lg:max-h-none` already handles large screens correctly
- Content padding wrapper: add `xl:px-8`
- Text container inner padding: current `px-10 md:px-16`, add `xl:px-20`

### 5. ServiceCardsSection

**File:** `frontend/src/theme/sections/ServiceCardsSection.tsx`

Current state:
- Grid gap: `gap-8 sm:gap-x-8 sm:gap-y-10`
- Image container: `w-full h-[180px] sm:w-[320px] sm:h-[240px]`

Changes:
- Image container: remove fixed `sm:w-[320px]`, change to `w-full h-[180px] sm:h-[220px] lg:h-[260px] xl:h-[280px]`
- Grid gap: add `xl:gap-x-10 xl:gap-y-12`
- Content padding wrapper: add `xl:px-8`

### 6. TeamGridSection

**File:** `frontend/src/theme/sections/TeamGridSection.tsx`

Current state:
- Avatar: `w-32 h-32 md:w-40 md:h-40`
- Top-level grid: `gap-8 md:gap-12`
- Bio grid: `gap-6 lg:gap-8`

Changes:
- Avatar: add `xl:w-44 xl:h-44`
- Top-level grid gap: add `xl:gap-14`
- Bio grid gap: add `xl:gap-10`
- Content padding wrapper: add `xl:px-8`

### 7. ContactFormSection

**File:** `frontend/src/theme/sections/ContactFormSection.tsx`

Current state:
- Grid gap: `gap-10 lg:gap-16`

Changes:
- Grid gap: **unchanged** — `lg:gap-16` already provides generous spacing at xl+
- Content padding wrapper: add `xl:px-8`

### 8. CompanyProfileSection

**File:** `frontend/src/theme/sections/CompanyProfileSection.tsx`

Current state:
- Grid gap: `gap-8 lg:gap-12`

Changes:
- Grid gap: add `xl:gap-16`
- Content padding wrapper: add `xl:px-8`

### 9. ChecklistSection

**File:** `frontend/src/theme/sections/ChecklistSection.tsx`

Changes:
- Content padding wrapper: add `xl:px-8`
- Vertical spacing: current `space-y-10 md:space-y-14`, add `xl:space-y-16`

### 10. RichTextSection

**File:** `frontend/src/theme/sections/RichTextSection.tsx`

Changes:
- Content padding wrapper: add `xl:px-8`

### 11. StatsCounterSection (corporate-classic plugin)

**File:** `frontend/src/plugins/themes/corporate-classic/StatsCounterSection.tsx`

Changes:
- Content padding wrapper: add `xl:px-8`

### 12. ThemedFooter

**File:** `frontend/src/theme/layouts/ThemedFooter.tsx`

Current state:
- Sections grid gap: `gap-8`
- Fallback layout gap: `gap-8`

Changes:
- Both gap instances: add `xl:gap-10`

### 13. ThemedHeader

**File:** `frontend/src/theme/layouts/ThemedHeader.tsx`

Changes:
- Language bar wrapper: add `xl:px-8`
- Nav wrapper: add `xl:px-8`

### 14. PublicLayout

**File:** `frontend/src/theme/layouts/PublicLayout.tsx`

Changes:
- Sidebar layout wrapper: add `xl:px-8`

### 15. Text Scaling Summary

| Element | Current Max | New xl Value |
|---------|------------|-------------|
| Hero title | `lg:text-4xl` | `xl:text-5xl` |
| Hero subtitle | `lg:text-3xl` | unchanged |
| Section h2 | varies (`lg:text-4xl` or `md:text-3xl`) | unchanged |
| Card h3 (CardGrid) | `md:text-2xl` | unchanged (already sufficient) |
| Body text | `text-base` | unchanged |

## Complete File List

1. `frontend/src/theme/tokens.ts` — maxWidth value
2. `frontend/tailwind.config.ts` — maxWidth.layout value
3. `frontend/src/index.css` — CSS variable + responsive section spacing
4. `frontend/src/theme/packages/modern-dark/index.ts` — maxWidth value
5. `frontend/src/theme/packages/warm-earth/index.ts` — maxWidth value
6. `frontend/src/theme/sections/HeroSection.tsx` — height strategy + title text
7. `frontend/src/theme/sections/CardGridSection.tsx` — wrapper padding only
8. `frontend/src/theme/sections/TextImageSection.tsx` — wrapper padding + text padding
9. `frontend/src/theme/sections/ServiceCardsSection.tsx` — image sizing + gap
10. `frontend/src/theme/sections/TeamGridSection.tsx` — avatar size + gaps
11. `frontend/src/theme/sections/ContactFormSection.tsx` — wrapper padding only
12. `frontend/src/theme/sections/CompanyProfileSection.tsx` — gap
13. `frontend/src/theme/sections/ChecklistSection.tsx` — wrapper padding + vertical spacing
14. `frontend/src/theme/sections/RichTextSection.tsx` — wrapper padding only
15. `frontend/src/plugins/themes/corporate-classic/StatsCounterSection.tsx` — wrapper padding only
16. `frontend/src/theme/sections/SectionRenderer.tsx` — no code change (spacing via CSS variable)
17. `frontend/src/theme/layouts/ThemedFooter.tsx` — gap
18. `frontend/src/theme/layouts/ThemedHeader.tsx` — wrapper padding
19. `frontend/src/theme/layouts/PublicLayout.tsx` — wrapper padding

## Testing Strategy

- Visual check at 1920x1080, 1440x900, 1366x768, 1280x720, 768x1024 (tablet), 375x667 (mobile)
- Verify no horizontal scrollbar at any resolution
- Verify images maintain aspect ratios and no distortion
- Verify other theme packages (modern-dark, warm-earth) also render correctly with new maxWidth
- Run `pnpm lint && pnpm type-check` for code quality
